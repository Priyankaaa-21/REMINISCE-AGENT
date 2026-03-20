import { z } from 'zod';
import { 
  insertUserSchema, insertMemorySchema, insertRoutineSchema, insertMedicationSchema,
  User, Memory, Routine, Medication, EmergencyLog
} from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  auth: {
    login: {
      method: 'POST' as const,
      path: '/api/login',
      input: z.object({ username: z.string(), password: z.string() }),
      responses: {
        200: z.custom<User>(),
        401: errorSchemas.internal,
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/logout',
      responses: {
        200: z.void(),
      },
    },
    register: {
      method: 'POST' as const,
      path: '/api/register',
      input: insertUserSchema,
      responses: {
        201: z.custom<User>(),
        400: errorSchemas.validation,
      },
    },
    user: {
      method: 'GET' as const,
      path: '/api/user',
      responses: {
        200: z.custom<User>(),
        401: z.null(),
      },
    },
  },
  memories: {
    list: {
      method: 'GET' as const,
      path: '/api/memories',
      responses: {
        200: z.array(z.custom<Memory>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/memories',
      input: insertMemorySchema,
      responses: {
        201: z.custom<Memory>(),
        400: errorSchemas.validation,
      },
    },
  },
  routines: {
    list: {
      method: 'GET' as const,
      path: '/api/routines',
      responses: {
        200: z.array(z.custom<Routine>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/routines',
      input: insertRoutineSchema,
      responses: {
        201: z.custom<Routine>(),
        400: errorSchemas.validation,
      },
    },
    toggle: {
      method: 'PATCH' as const,
      path: '/api/routines/:id/toggle',
      responses: {
        200: z.custom<Routine>(),
        404: errorSchemas.notFound,
      },
    },
  },
  medications: {
    list: {
      method: 'GET' as const,
      path: '/api/medications',
      responses: {
        200: z.array(z.custom<Medication>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/medications',
      input: insertMedicationSchema,
      responses: {
        201: z.custom<Medication>(),
        400: errorSchemas.validation,
      },
    },
    toggle: {
      method: 'PATCH' as const,
      path: '/api/medications/:id/toggle',
      responses: {
        200: z.custom<Medication>(),
        404: errorSchemas.notFound,
      },
    },
  },
  emergency: {
    list: {
      method: 'GET' as const,
      path: '/api/emergency',
      responses: {
        200: z.array(z.custom<EmergencyLog>()),
      },
    },
    trigger: {
      method: 'POST' as const,
      path: '/api/emergency',
      responses: {
        201: z.custom<EmergencyLog>(),
      },
    },
    resolve: {
      method: 'PATCH' as const,
      path: '/api/emergency/:id/resolve',
      responses: {
        200: z.custom<EmergencyLog>(),
        404: errorSchemas.notFound,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

// Export types for client usage
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertMemory = z.infer<typeof insertMemorySchema>;
export type InsertRoutine = z.infer<typeof insertRoutineSchema>;
export type InsertMedication = z.infer<typeof insertMedicationSchema>;
