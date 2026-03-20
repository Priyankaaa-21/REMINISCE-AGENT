import { z } from "zod";
import { ObjectId } from "mongodb";

// MongoDB Schema Interfaces
export interface User {
  _id?: ObjectId;
  id: number;
  username: string;
  password: string;
  role: string;
  caretakerId?: number;
  phoneNumber?: string; // Caretaker phone number
}

export interface Memory {
  _id?: ObjectId;
  id: number;
  patientId: number;
  imageUrl: string;
  description?: string; // Caretaker's description (not shown to patient)
  aiQuestions?: string[]; // Array of 7-8 AI-generated questions
  answers?: { date: string; answer: string }[]; // Patient's answers with timestamps
  lastQuestionDate?: string; // Date when question was last changed (YYYY-MM-DD)
  currentQuestionIndex?: number; // Index of today's question
  createdAt: Date;
}

export interface Routine {
  _id?: ObjectId;
  id: number;
  patientId: number;
  task: string;
  time?: string;
  frequency?: 'daily' | 'weekly' | 'once' | 'as-needed';
  type?: 'task' | 'medication';
  dosage?: string;
  isCompleted: boolean;
}

export interface Medication {
  _id?: ObjectId;
  id: number;
  patientId: number;
  name: string;
  time: string;
  dosage?: string;
  taken: boolean;
}

export interface EmergencyLog {
  _id?: ObjectId;
  id: number;
  patientId: number;
  timestamp: Date;
  status: string;
  resolved: boolean;
}

// For backward compatibility, create table-like objects
export const users = {
  name: "users" as const,
};

export const memories = {
  name: "memories" as const,
};

export const routines = {
  name: "routines" as const,
};

export const medications = {
  name: "medications" as const,
};

export const emergencyLogs = {
  name: "emergency_logs" as const,
};

// Zod validation schemas
export const insertUserSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  role: z.enum(["caretaker", "patient"]).default("caretaker"),
  caretakerId: z.number().optional(),
  caretakerUsername: z.string().optional(),
  phoneNumber: z.string().optional(), // Caretaker phone number
});

export const insertMemorySchema = z.object({
  patientId: z.number(),
  imageUrl: z.string().url(),
  description: z.string().optional(),
  aiQuestion: z.string().optional(),
});

export const insertRoutineSchema = z.object({
  patientId: z.number(),
  task: z.string(),
  time: z.string().optional(),
  frequency: z.enum(['daily', 'weekly', 'once', 'as-needed']).default('daily'),
  type: z.enum(['task', 'medication']).default('task'),
  dosage: z.string().optional(),
  isCompleted: z.boolean().default(false),
});

export const insertMedicationSchema = z.object({
  patientId: z.number(),
  name: z.string(),
  time: z.string(),
  dosage: z.string().optional(),
  taken: z.boolean().default(false),
});

export const insertEmergencyLogSchema = z.object({
  patientId: z.number(),
  status: z.string().default("High Alert"),
  resolved: z.boolean().default(false),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertMemory = z.infer<typeof insertMemorySchema>;
export type InsertRoutine = z.infer<typeof insertRoutineSchema>;
export type InsertMedication = z.infer<typeof insertMedicationSchema>;
export type InsertEmergencyLog = z.infer<typeof insertEmergencyLogSchema>;
