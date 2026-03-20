import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { analyzeImageWithVision, generateMemoryQuestions } from "./azure_services";
import { hashPassword } from "./auth";

async function seedDatabase() {
  const existingUser = await storage.getUserByUsername("caretaker");
  if (!existingUser) {
    const password = await hashPassword("password123");
    const caretaker = await storage.createUser({ username: "caretaker", password, role: "caretaker" });
    const patient = await storage.createUser({ username: "patient", password, role: "patient", caretakerId: caretaker.id });
    
    await storage.createMemory({
      patientId: patient.id,
      imageUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d",
      description: "Family picnic at the park, 1985. Tags: park, family, picnic",
      aiQuestion: "Who is holding the frisbee in this picture?"
    });

    await storage.createRoutine({ patientId: patient.id, task: "Morning Walk", isCompleted: false });
    await storage.createRoutine({ patientId: patient.id, task: "Drink Water", isCompleted: true });

    await storage.createMedication({ patientId: patient.id, name: "Aspirin", time: "08:00 AM", taken: false });
  }
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  await seedDatabase();
  setupAuth(app);

  // Helper to ensure data isolation
  const verifyPatientAccess = async (req: any, patientId: number) => {
    if (req.user.role === 'patient') {
      return req.user.id === patientId;
    }
    // If caretaker, ensure the patient belongs to them
    const patient = await storage.getUser(patientId);
    return patient && patient.role === 'patient' && patient.caretakerId === req.user.id;
  };

  app.get("/api/user/patients", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'caretaker') return res.sendStatus(401);
    console.log("Fetching patients for caretaker ID:", req.user.id);
    const myPatients = await storage.getPatientsForCaretaker(req.user.id);
    console.log("Found patients:", myPatients.length, myPatients.map(p => ({ id: p.id, username: p.username, caretakerId: p.caretakerId })));
    res.json(myPatients);
  });

  app.get("/api/user/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = Number(req.params.id);
    const user = await storage.getUser(userId);
    
    // Only allow fetching caretaker info for privacy
    if (!user || user.role !== 'caretaker') {
      return res.sendStatus(404);
    }
    
    // Return limited info (no password)
    res.json({
      id: user.id,
      username: user.username,
      role: user.role,
      phoneNumber: user.phoneNumber,
    });
  });

  // Helper to get patientId
  const getTargetPatientId = async (req: any) => {
    if (req.user?.role === 'patient') return req.user.id;
    const queryPatientId = req.query.patientId ? Number(req.query.patientId) : undefined;
    if (queryPatientId) {
      const hasAccess = await verifyPatientAccess(req, queryPatientId);
      return hasAccess ? queryPatientId : undefined;
    }
    return undefined;
  };

  // Memories
  app.get(api.memories.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const patientId = await getTargetPatientId(req);
    if (!patientId) return res.json([]);

    const memories = await storage.getMemories(patientId);
    res.json(memories);
  });

  app.post(api.memories.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const input = api.memories.create.input.parse(req.body);
      
      let targetPatientId = req.user.role === 'patient' ? req.user.id : (req.body as any).patientId;
      if (!targetPatientId && req.user.role === 'caretaker') {
         return res.status(400).json({message: "patientId required"});
      }

      // AI analysis with Azure Computer Vision and Gemini
      const imageAnalysis = await analyzeImageWithVision(input.imageUrl);
      
      // Get previous Q&A for this patient if regenerating
      const previousMemories = await storage.getMemories(targetPatientId);
      const previousQA = previousMemories
        .filter(m => m.answers && m.answers.length > 0)
        .flatMap(m => m.aiQuestions?.map((q, i) => ({
          question: q,
          answer: m.answers?.find(a => a.answer)?.answer || ""
        })) || [])
        .filter(qa => qa.answer)
        .slice(0, 10); // Use last 10 answered questions for context
      
      const aiQuestions = await generateMemoryQuestions(
        imageAnalysis, 
        input.description || '',
        previousQA.length > 0 ? previousQA : undefined
      );
      
      // Combine analysis with user description
      const enhancedDescription = `${input.description || ''}`;
      
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      
      const memory = await storage.createMemory({
        ...input,
        patientId: targetPatientId,
        description: enhancedDescription, // Full description for caretaker
        aiQuestions: aiQuestions, // 7-8 AI-generated questions
        answers: [], // Empty answers array
        lastQuestionDate: today, // Set today as the question date
        currentQuestionIndex: 0 // Start with first question
      });
      res.status(201).json(memory);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(500).json({ message: 'Internal Server Error' });
      }
    }
  });

  // Upload image endpoint (convert to base64 data URL)
  app.post("/api/upload-image", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { imageData } = req.body;
      
      if (!imageData || !imageData.startsWith('data:image')) {
        return res.status(400).json({ message: 'Invalid image data' });
      }
      
      // Return data URL (in production, upload to Azure Blob Storage)
      res.json({ imageUrl: imageData });
    } catch (error) {
      console.error('Image upload error:', error);
      res.status(500).json({ message: 'Failed to upload image' });
    }
  });

  // Save answer to memory question
  app.post("/api/memories/:id/answer", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const memoryId = Number(req.params.id);
      const { answer } = req.body;
      
      if (!answer || typeof answer !== 'string') {
        return res.status(400).json({ message: 'Answer is required' });
      }
      
      const memory = await storage.getMemory(memoryId);
      if (!memory) {
        return res.status(404).json({ message: 'Memory not found' });
      }
      
      // Verify access
      const hasAccess = await verifyPatientAccess(req, memory.patientId);
      if (!hasAccess) {
        return res.sendStatus(403);
      }
      
      const today = new Date().toISOString().split('T')[0];
      const updatedMemory = await storage.saveMemoryAnswer(memoryId, today, answer);
      
      res.json(updatedMemory);
    } catch (error) {
      console.error('Save answer error:', error);
      res.status(500).json({ message: 'Failed to save answer' });
    }
  });

  // Text-to-Speech endpoint for memory questions (Azure Speech Service)
  app.post("/api/text-to-speech", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { text } = req.body;
      
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ message: 'Text is required' });
      }
      
      const { textToSpeech } = await import("./azure_services");
      const result = await textToSpeech(text);
      
      res.json(result);
    } catch (error: any) {
      console.error('Text-to-speech error:', error);
      res.status(500).json({ message: error.message || 'Failed to generate speech' });
    }
  });

  // Routines
  app.get(api.routines.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const patientId = await getTargetPatientId(req);
    if (!patientId) return res.json([]);
    const routines = await storage.getRoutines(patientId);
    res.json(routines);
  });

  app.post(api.routines.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const input = api.routines.create.input.parse(req.body);
      const patientId = req.user.role === 'patient' ? req.user.id : (req.body as any).patientId;
      if (!patientId) return res.status(400).json({message: 'patientId required'});

      const routine = await storage.createRoutine({ ...input, patientId });
      res.status(201).json(routine);
    } catch (err) {
      res.status(400).json({ message: 'Invalid input' });
    }
  });

  app.patch(api.routines.toggle.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const updated = await storage.toggleRoutine(Number(req.params.id));
    if (!updated) return res.status(404).json({ message: 'Routine not found' });
    res.json(updated);
  });

  // Medications
  app.get(api.medications.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const patientId = await getTargetPatientId(req);
    if (!patientId) return res.json([]);
    const meds = await storage.getMedications(patientId);
    res.json(meds);
  });

  app.post(api.medications.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const input = api.medications.create.input.parse(req.body);
      const patientId = req.user.role === 'patient' ? req.user.id : (req.body as any).patientId;
      if (!patientId) return res.status(400).json({message: 'patientId required'});

      const med = await storage.createMedication({ ...input, patientId });
      res.status(201).json(med);
    } catch (err) {
      res.status(400).json({ message: 'Invalid input' });
    }
  });

  app.patch(api.medications.toggle.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const updated = await storage.toggleMedication(Number(req.params.id));
    if (!updated) return res.status(404).json({ message: 'Medication not found' });
    res.json(updated);
  });

  // Emergency
  app.get(api.emergency.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // If caretaker, get logs for all their patients
    if (req.user.role === 'caretaker') {
      const patients = await storage.getPatientsForCaretaker(req.user.id);
      const allLogs = [];
      for (const patient of patients) {
        const logs = await storage.getEmergencyLogs(patient.id);
        allLogs.push(...logs);
      }
      // Sort by timestamp descending (most recent first)
      allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return res.json(allLogs);
    }
    
    // If patient, get their own logs
    const patientId = await getTargetPatientId(req);
    if (!patientId) return res.json([]);
    const logs = await storage.getEmergencyLogs(patientId);
    res.json(logs);
  });

  app.post(api.emergency.trigger.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== 'patient') return res.status(403).send('Only patients can trigger SOS');
    
    const patientId = req.user.id;
    
    // Get patient info to find caretaker
    const patient = await storage.getUser(patientId);
    if (!patient || !patient.caretakerId) {
      return res.status(400).json({ error: 'Patient has no assigned caretaker' });
    }
    
    // Get caretaker info
    const caretaker = await storage.getUser(patient.caretakerId);
    if (!caretaker) {
      return res.status(400).json({ error: 'Caretaker not found' });
    }
    
    // Create emergency log
    const log = await storage.triggerEmergency(patientId);
    
    res.status(201).json({ 
      ...log, 
      caretakerPhone: caretaker.phoneNumber,
      caretakerName: caretaker.username,
      message: 'Emergency triggered. Call emergency services (112) or your caretaker.'
    });
  });

  app.patch(api.emergency.resolve.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== 'caretaker') return res.status(403).send('Only caretakers can resolve emergency logs');
    
    const logId = parseInt(req.params.id);
    if (isNaN(logId)) return res.status(400).json({ message: 'Invalid log ID' });
    
    const resolved = await storage.resolveEmergencyLog(logId);
    if (!resolved) return res.status(404).json({ message: 'Emergency log not found' });
    
    res.json(resolved);
  });

  return httpServer;
}
