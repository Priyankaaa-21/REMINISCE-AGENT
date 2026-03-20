import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type InsertMemory, type InsertRoutine, type InsertMedication } from "@shared/routes";

// --- MEMORIES ---
export function useMemories(patientId?: number) {
  return useQuery({
    queryKey: [api.memories.list.path, patientId],
    queryFn: async () => {
      const url = patientId ? `${api.memories.list.path}?patientId=${patientId}` : api.memories.list.path;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch memories");
      return api.memories.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateMemory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertMemory) => {
      const validated = api.memories.create.input.parse(data);
      const res = await fetch(api.memories.create.path, {
        method: api.memories.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });
      if (!res.ok) throw new Error("Failed to create memory");
      return api.memories.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.memories.list.path] }),
  });
}

// --- ROUTINES ---
export function useRoutines(patientId?: number) {
  return useQuery({
    queryKey: [api.routines.list.path, patientId],
    queryFn: async () => {
      const url = patientId ? `${api.routines.list.path}?patientId=${patientId}` : api.routines.list.path;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch routines");
      return api.routines.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateRoutine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertRoutine) => {
      const validated = api.routines.create.input.parse(data);
      const res = await fetch(api.routines.create.path, {
        method: api.routines.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });
      if (!res.ok) throw new Error("Failed to create routine");
      return api.routines.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.routines.list.path] }),
  });
}

export function useToggleRoutine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.routines.toggle.path, { id });
      const res = await fetch(url, { method: api.routines.toggle.method });
      if (!res.ok) throw new Error("Failed to toggle routine");
      return api.routines.toggle.responses[200].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.routines.list.path] }),
  });
}

// --- MEDICATIONS ---
export function useMedications(patientId?: number) {
  return useQuery({
    queryKey: [api.medications.list.path, patientId],
    queryFn: async () => {
      const url = patientId ? `${api.medications.list.path}?patientId=${patientId}` : api.medications.list.path;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch medications");
      return api.medications.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateMedication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertMedication) => {
      const validated = api.medications.create.input.parse(data);
      const res = await fetch(api.medications.create.path, {
        method: api.medications.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });
      if (!res.ok) throw new Error("Failed to create medication");
      return api.medications.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.medications.list.path] }),
  });
}

export function useToggleMedication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.medications.toggle.path, { id });
      const res = await fetch(url, { method: api.medications.toggle.method });
      if (!res.ok) throw new Error("Failed to toggle medication");
      return api.medications.toggle.responses[200].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.medications.list.path] }),
  });
}

// --- EMERGENCY ---
export function useEmergencyLogs() {
  return useQuery({
    queryKey: [api.emergency.list.path],
    queryFn: async () => {
      const res = await fetch(api.emergency.list.path);
      if (!res.ok) throw new Error("Failed to fetch logs");
      return api.emergency.list.responses[200].parse(await res.json());
    },
    refetchInterval: 5000, // Poll every 5 seconds for safety
  });
}

export function useTriggerEmergency() {
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(api.emergency.trigger.path, {
        method: api.emergency.trigger.method,
      });
      if (!res.ok) throw new Error("Failed to trigger SOS");
      return api.emergency.trigger.responses[201].parse(await res.json());
    },
  });
}

export function useResolveEmergency() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (logId: number) => {
      const url = buildUrl(api.emergency.resolve.path, { id: logId });
      const res = await fetch(url, { method: api.emergency.resolve.method });
      if (!res.ok) throw new Error("Failed to resolve emergency log");
      return api.emergency.resolve.responses[200].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.emergency.list.path] }),
  });
}
