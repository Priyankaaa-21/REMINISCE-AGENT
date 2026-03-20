import { getDb, getNextSequence } from "./db";
import type {
  User, Memory, Routine, Medication, EmergencyLog,
  InsertUser, InsertMemory, InsertRoutine, InsertMedication
} from "@shared/schema";
import { Db } from "mongodb";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Scoped by patientId
  createMemory(memory: InsertMemory): Promise<Memory>;
  getMemories(patientId: number): Promise<Memory[]>;
  getMemory(id: number): Promise<Memory | null>;
  saveMemoryAnswer(memoryId: number, date: string, answer: string): Promise<Memory | null>;

  createRoutine(routine: InsertRoutine): Promise<Routine>;
  getRoutines(patientId: number): Promise<Routine[]>;
  toggleRoutine(id: number): Promise<Routine | undefined>;

  createMedication(med: InsertMedication): Promise<Medication>;
  getMedications(patientId: number): Promise<Medication[]>;
  toggleMedication(id: number): Promise<Medication | undefined>;

  triggerEmergency(patientId: number): Promise<EmergencyLog>;
  getEmergencyLogs(patientId: number): Promise<EmergencyLog[]>;
  getPatientsForCaretaker(caretakerId: number): Promise<User[]>;
}

export class DatabaseStorage implements IStorage {
  private db: Db | null = null;

  private async getDatabase(): Promise<Db> {
    if (!this.db) {
      this.db = await getDb();
    }
    return this.db;
  }

  async getUser(id: number): Promise<User | undefined> {
    const db = await this.getDatabase();
    const user = await db.collection<User>("users").findOne({ id });
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const db = await this.getDatabase();
    const user = await db.collection<User>("users").findOne({ username });
    return user || undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const db = await this.getDatabase();
    const id = await getNextSequence(db, "users");
    const newUser: User = {
      id,
      username: user.username,
      password: user.password,
      role: user.role || "caretaker",
      caretakerId: user.caretakerId,
      phoneNumber: user.phoneNumber,
    };
    await db.collection<User>("users").insertOne(newUser as any);
    return newUser;
  }

  async createMemory(memory: InsertMemory): Promise<Memory> {
    const db = await this.getDatabase();
    const id = await getNextSequence(db, "memories");
    const newMemory: Memory = {
      id,
      patientId: memory.patientId,
      imageUrl: memory.imageUrl,
      description: memory.description,
      aiQuestion: memory.aiQuestion,
      createdAt: new Date(),
    };
    await db.collection<Memory>("memories").insertOne(newMemory as any);
    return newMemory;
  }

  async getMemories(patientId: number): Promise<Memory[]> {
    const db = await this.getDatabase();
    return await db.collection<Memory>("memories")
      .find({ patientId })
      .sort({ createdAt: -1 })
      .toArray();
  }

  async getMemory(id: number): Promise<Memory | null> {
    const db = await this.getDatabase();
    return await db.collection<Memory>("memories").findOne({ id });
  }

  async saveMemoryAnswer(memoryId: number, date: string, answer: string): Promise<Memory | null> {
    const db = await this.getDatabase();
    
    const memory = await db.collection<Memory>("memories").findOne({ id: memoryId });
    if (!memory) return null;
    
    // Check if we need to move to next question (new day)
    const today = new Date().toISOString().split('T')[0];
    let currentIndex = memory.currentQuestionIndex || 0;
    let lastQuestionDate = memory.lastQuestionDate;
    
    if (lastQuestionDate !== today && memory.aiQuestions) {
      // New day, move to next question
      currentIndex = (currentIndex + 1) % memory.aiQuestions.length;
      lastQuestionDate = today;
    }
    
    // Add or update answer for today
    const answers = memory.answers || [];
    const existingAnswerIndex = answers.findIndex(a => a.date === date);
    
    if (existingAnswerIndex >= 0) {
      answers[existingAnswerIndex] = { date, answer };
    } else {
      answers.push({ date, answer });
    }
    
    const result = await db.collection<Memory>("memories").findOneAndUpdate(
      { id: memoryId },
      { 
        $set: { 
          answers,
          currentQuestionIndex: currentIndex,
          lastQuestionDate
        } 
      },
      { returnDocument: "after" }
    );
    
    return result || null;
  }

  async createRoutine(routine: InsertRoutine): Promise<Routine> {
    const db = await this.getDatabase();
    const id = await getNextSequence(db, "routines");
    const newRoutine: Routine = {
      id,
      patientId: routine.patientId,
      task: routine.task,
      time: routine.time,
      frequency: routine.frequency,
      type: routine.type,
      dosage: routine.dosage,
      isCompleted: routine.isCompleted || false,
    };
    await db.collection<Routine>("routines").insertOne(newRoutine as any);
    return newRoutine;
  }

  async getRoutines(patientId: number): Promise<Routine[]> {
    const db = await this.getDatabase();
    return await db.collection<Routine>("routines")
      .find({ patientId })
      .sort({ id: -1 })
      .toArray();
  }

  async toggleRoutine(id: number): Promise<Routine | undefined> {
    const db = await this.getDatabase();
    const routine = await db.collection<Routine>("routines").findOne({ id });
    if (!routine) return undefined;
    
    const result = await db.collection<Routine>("routines").findOneAndUpdate(
      { id },
      { $set: { isCompleted: !routine.isCompleted } },
      { returnDocument: "after" }
    );
    return result || undefined;
  }

  async createMedication(med: InsertMedication): Promise<Medication> {
    const db = await this.getDatabase();
    const id = await getNextSequence(db, "medications");
    const newMed: Medication = {
      id,
      patientId: med.patientId,
      name: med.name,
      time: med.time,
      dosage: med.dosage,
      taken: med.taken || false,
    };
    await db.collection<Medication>("medications").insertOne(newMed as any);
    return newMed;
  }

  async getMedications(patientId: number): Promise<Medication[]> {
    const db = await this.getDatabase();
    return await db.collection<Medication>("medications")
      .find({ patientId })
      .sort({ id: -1 })
      .toArray();
  }

  async toggleMedication(id: number): Promise<Medication | undefined> {
    const db = await this.getDatabase();
    const med = await db.collection<Medication>("medications").findOne({ id });
    if (!med) return undefined;
    
    const result = await db.collection<Medication>("medications").findOneAndUpdate(
      { id },
      { $set: { taken: !med.taken } },
      { returnDocument: "after" }
    );
    return result || undefined;
  }

  async triggerEmergency(patientId: number): Promise<EmergencyLog> {
    const db = await this.getDatabase();
    const id = await getNextSequence(db, "emergency_logs");
    const newLog: EmergencyLog = {
      id,
      patientId,
      timestamp: new Date(),
      status: "High Alert",
      resolved: false,
    };
    await db.collection<EmergencyLog>("emergency_logs").insertOne(newLog as any);
    return newLog;
  }

  async getEmergencyLogs(patientId: number): Promise<EmergencyLog[]> {
    const db = await this.getDatabase();
    return await db.collection<EmergencyLog>("emergency_logs")
      .find({ patientId })
      .sort({ timestamp: -1 })
      .toArray();
  }

  async resolveEmergencyLog(logId: number): Promise<EmergencyLog | null> {
    const db = await this.getDatabase();
    const result = await db.collection<EmergencyLog>("emergency_logs")
      .findOneAndUpdate(
        { id: logId },
        { $set: { resolved: true } },
        { returnDocument: "after" }
      );
    return result || null;
  }

  async getPatientsForCaretaker(caretakerId: number): Promise<User[]> {
    const db = await this.getDatabase();
    console.log("Searching for patients with caretakerId:", caretakerId);
    const patients = await db.collection<User>("users")
      .find({ caretakerId, role: "patient" })
      .sort({ username: 1 })
      .toArray();
    console.log("MongoDB query result:", patients.length, "patients found");
    return patients;
  }
}

export const storage = new DatabaseStorage();
