import { useState } from "react";
import { Layout } from "@/components/ui/Layout";
import { useMemories, useCreateMemory, useRoutines, useCreateRoutine, useMedications, useCreateMedication, useEmergencyLogs, useResolveEmergency } from "@/hooks/use-resources";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Plus, Upload, CheckCircle, Clock, AlertTriangle, Pill, Activity, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import type { User } from "@shared/schema";

// --- Components for specific sections ---

function MemorySection({ patientId }: { patientId: number }) {
  const { data: memories } = useMemories(patientId);
  const createMemory = useCreateMemory();
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadType, setUploadType] = useState<"url" | "file">("file");
  const { toast } = useToast();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate all files
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not an image file`,
          variant: "destructive",
        });
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} is larger than 5MB`,
          variant: "destructive",
        });
        return;
      }
    }

    setIsUploading(true);
    try {
      const uploadPromises = files.map(file => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = async (event) => {
            const imageData = event.target?.result as string;
            
            // Upload to server
            const res = await fetch('/api/upload-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ imageData }),
            });
            
            if (!res.ok) throw new Error('Upload failed');
            
            const data = await res.json();
            resolve(data.imageUrl);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      setImageUrls(prev => [...prev, ...uploadedUrls]);
      setIsUploading(false);
      toast({
        title: `${files.length} image${files.length > 1 ? 's' : ''} uploaded`,
        description: "You can now add a description and save",
      });
    } catch (error) {
      console.error('Upload error:', error);
      setIsUploading(false);
      toast({
        title: "Upload failed",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (imageUrls.length === 0) {
      toast({
        title: "Images required",
        description: "Please upload at least one image",
        variant: "destructive",
      });
      return;
    }

    // Create a memory for each image
    const promises = imageUrls.map(imageUrl => {
      return new Promise((resolve, reject) => {
        createMemory.mutate({ 
          patientId,
          imageUrl, 
          description,
        }, {
          onSuccess: resolve,
          onError: reject
        });
      });
    });

    try {
      await Promise.all(promises);
      setIsOpen(false);
      setImageUrls([]);
      setDescription("");
      toast({
        title: `${imageUrls.length} memor${imageUrls.length > 1 ? 'ies' : 'y'} saved!`,
        description: "All images have been added with AI-generated questions",
      });
    } catch (error: any) {
      toast({
        title: "Failed to save some memories",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  const removeImage = (index: number) => {
    setImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Upload className="w-6 h-6 text-primary" />
          Memory Bank
        </h2>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Photo
        </button>
      </div>

      {isOpen && (
        <motion.form
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm space-y-4"
        >
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setUploadType("file")}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                uploadType === "file" ? "bg-primary text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Upload Image
            </button>
            <button
              type="button"
              onClick={() => setUploadType("url")}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                uploadType === "url" ? "bg-primary text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Image URL
            </button>
          </div>

          {uploadType === "file" ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Upload Photos (Multiple)</label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-primary transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="image-upload"
                  disabled={isUploading}
                  multiple
                />
                <label htmlFor="image-upload" className="cursor-pointer">
                  <Upload className="w-12 h-12 mx-auto mb-2 text-slate-400" />
                  <p className="text-sm text-slate-600">
                    {isUploading ? "Uploading..." : imageUrls.length > 0 ? `✓ ${imageUrls.length} image(s) uploaded` : "Click to upload or drag and drop"}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">PNG, JPG, GIF up to 5MB each (multiple files)</p>
                </label>
              </div>
              {imageUrls.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {imageUrls.map((url, index) => (
                    <div key={index} className="relative group">
                      <img src={url} alt={`Preview ${index + 1}`} className="w-full h-32 object-cover rounded-lg" />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Image URL</label>
              <input
                required={uploadType === "url"}
                value={imageUrls[0] || ""}
                onChange={(e) => setImageUrls([e.target.value])}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                placeholder="https://example.com/photo.jpg"
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description / Context</label>
            <textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none h-24 resize-none"
              placeholder="Who is this? When was it taken? Where was this?"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { setIsOpen(false); setImageUrl(""); setDescription(""); }}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMemory.isPending || isUploading}
              className="px-6 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {createMemory.isPending ? (
                <><Clock className="w-4 h-4 animate-spin" /> Analyzing...</>
              ) : (
                <><CheckCircle className="w-4 h-4" /> Save Memory</>
              )}
            </button>
          </div>
        </motion.form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {memories?.map((memory) => (
          <div key={memory.id} className="group relative aspect-[4/3] rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300">
            <img src={memory.imageUrl} alt={memory.description || "Memory"} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
              <p className="text-white font-medium">{memory.description}</p>
              <p className="text-white/70 text-sm mt-1">AI Prompt: {memory.aiQuestion}</p>
            </div>
          </div>
        ))}
        {memories?.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
            <Upload className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No memories uploaded yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function RoutineSection({ patientId }: { patientId: number }) {
  const { data: routines } = useRoutines(patientId);
  const createRoutine = useCreateRoutine();
  const [task, setTask] = useState("");
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'once' | 'as-needed'>('daily');
  const [time, setTime] = useState("");

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!task.trim()) return;
    createRoutine.mutate({ patientId, task, time: time || undefined, frequency, type: 'task', isCompleted: false }, {
      onSuccess: () => {
        setTask("");
        setTime("");
        setFrequency('daily');
      }
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 h-full flex flex-col">
      <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-6">
        <CheckCircle className="w-5 h-5 text-emerald-500" />
        Daily Routine & Tasks
      </h2>
      
      <div className="flex-1 overflow-y-auto space-y-3 min-h-[200px]">
        {routines?.map((routine) => (
          <div key={routine.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 flex-shrink-0 ${routine.isCompleted ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
              {routine.isCompleted && <CheckCircle className="w-3 h-3 text-white" />}
            </div>
            <div className="flex-1">
              <span className={`text-sm font-medium block ${routine.isCompleted ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                {routine.task}
              </span>
              <div className="flex gap-2 mt-1">
                {routine.time && (
                  <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    <Clock className="w-3 h-3 inline mr-1" />
                    {routine.time}
                  </span>
                )}
                {routine.frequency && (
                  <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-medium">
                    {routine.frequency}
                  </span>
                )}
                {routine.type === 'medication' && (
                  <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-medium">
                    <Pill className="w-3 h-3 inline mr-1" />
                    Medicine
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        {routines?.length === 0 && <p className="text-center text-slate-400 text-sm py-4">No routines set.</p>}
      </div>

      <form onSubmit={handleAdd} className="mt-4 pt-4 border-t border-slate-100 space-y-3">
        <input
          value={task}
          onChange={(e) => setTask(e.target.value)}
          placeholder="Add new task..."
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <div className="flex gap-2">
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            placeholder="Time (optional)"
            className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as any)}
            className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="once">Once</option>
            <option value="as-needed">As Needed</option>
          </select>
        </div>
        <button 
          type="submit"
          disabled={createRoutine.isPending || !task.trim()}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Task
        </button>
      </form>
    </div>
  );
}

function MedicationSection({ patientId }: { patientId: number }) {
  const { data: routines } = useRoutines(patientId);
  const createRoutine = useCreateRoutine();
  const [name, setName] = useState("");
  const [time, setTime] = useState("");
  const [dosage, setDosage] = useState("");

  // Filter only medications from routines
  const medications = routines?.filter(r => r.type === 'medication') || [];

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !time.trim()) return;
    createRoutine.mutate({ 
      patientId, 
      task: name, 
      time, 
      type: 'medication',
      dosage: dosage || undefined,
      frequency: 'daily',
      isCompleted: false 
    }, {
      onSuccess: () => { 
        setName(""); 
        setTime(""); 
        setDosage("");
      }
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 h-full flex flex-col">
      <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-6">
        <Pill className="w-5 h-5 text-indigo-500" />
        Medication
      </h2>

      <div className="flex-1 overflow-y-auto space-y-3 min-h-[200px]">
        {medications?.map((med) => (
          <div key={med.id} className="flex items-center justify-between p-3 rounded-lg bg-indigo-50/50 border border-indigo-100">
            <div>
              <p className="font-semibold text-slate-800 text-sm">{med.task}</p>
              <div className="flex items-center gap-2 text-xs text-indigo-600 mt-1">
                <Clock className="w-3 h-3" />
                {med.time}
                {med.dosage && <span className="text-slate-500">• {med.dosage}</span>}
              </div>
            </div>
            <div className={`px-2 py-1 rounded text-xs font-bold ${med.isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              {med.isCompleted ? 'TAKEN' : 'PENDING'}
            </div>
          </div>
        ))}
        {medications?.length === 0 && <p className="text-center text-slate-400 text-sm py-4">No medications scheduled.</p>}
      </div>

      <form onSubmit={handleAdd} className="mt-4 pt-4 border-t border-slate-100 space-y-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Medication name..."
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
        <input
          value={dosage}
          onChange={(e) => setDosage(e.target.value)}
          placeholder="Dosage (e.g., 10mg, 2 tablets)..."
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
        <div className="flex gap-2">
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          <button 
            disabled={createRoutine.isPending}
            className="px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium text-sm"
          >
            Add
          </button>
        </div>
      </form>
    </div>
  );
}

function EmergencyLogSection() {
  const { data: logs, isLoading, error } = useEmergencyLogs();
  const resolveEmergency = useResolveEmergency();
  const { toast } = useToast();

  console.log('Emergency logs:', { logs, isLoading, error });

  const handleResolve = (logId: number) => {
    resolveEmergency.mutate(logId, {
      onSuccess: () => {
        toast({
          title: "Emergency Resolved",
          description: "The emergency log has been marked as resolved.",
        });
      },
      onError: (error: any) => {
        toast({
          title: "Failed to resolve",
          description: error.message || "Please try again",
          variant: "destructive",
        });
      },
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-6 col-span-1 lg:col-span-2">
      <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-6">
        <AlertTriangle className="w-5 h-5 text-red-500" />
        Emergency Log
      </h2>
      {isLoading && (
        <div className="text-center py-8 text-slate-400">
          Loading emergency logs...
        </div>
      )}
      {error && (
        <div className="text-center py-8 text-red-600">
          Error loading logs: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      )}
      {!isLoading && !error && (
        <div className="bg-red-50/50 rounded-xl overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-red-100/50 text-red-900 font-semibold">
              <tr>
                <th className="p-3">Time</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-red-100">
              {logs?.map((log) => (
                <tr key={log.id}>
                  <td className="p-3 text-slate-700">
                    {log.timestamp ? format(new Date(log.timestamp), "MMM d, h:mm a") : "Unknown"}
                  </td>
                  <td className="p-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${log.resolved ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800 animate-pulse'}`}>
                      {log.resolved ? 'Resolved' : 'ACTIVE SOS'}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    {!log.resolved && (
                      <button 
                        onClick={() => handleResolve(log.id)}
                        disabled={resolveEmergency.isPending}
                        className="text-xs font-bold text-red-600 hover:text-red-800 underline disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {resolveEmergency.isPending ? 'Resolving...' : 'Mark Resolved'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {logs?.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-slate-400">
                    No emergency alerts recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function CaretakerDashboard() {
  const { toast } = useToast();
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  
  // Fetch all patients linked to this caretaker
  const { data: patients } = useQuery<User[]>({
    queryKey: ["/api/user/patients"],
    queryFn: async () => {
      const res = await fetch("/api/user/patients");
      if (!res.ok) throw new Error("Failed to fetch patients");
      const data = await res.json();
      console.log("Fetched patients:", data);
      return data;
    },
  });

  // Auto-select first patient if none selected
  const activePatientId = selectedPatientId || patients?.[0]?.id;

  return (
    <Layout variant="caretaker">
      <div className="space-y-8">
        {/* Patient Selection Card */}
        {patients && patients.length > 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-3 sm:mb-4">Select Patient</h3>
            <div className="flex gap-2 sm:gap-4 flex-wrap">
              {patients.map(patient => (
                <Button
                  key={patient.id}
                  onClick={() => setSelectedPatientId(patient.id)}
                  variant={activePatientId === patient.id ? "default" : "outline"}
                  className="font-medium"
                >
                  {patient.username}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <p className="text-slate-500">No patients linked to your account yet. Patients can link to you during registration by entering your username.</p>
          </div>
        )}

        {/* Dashboard Sections - only show if patient is selected */}
        {activePatientId ? (
          <div className="space-y-8">
            <MemorySection patientId={activePatientId} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <RoutineSection patientId={activePatientId} />
              <MedicationSection patientId={activePatientId} />
            </div>

            <EmergencyLogSection />
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
            <p className="text-slate-400 text-lg">Select a patient to manage their care</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
