import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import { apiRequest } from "../lib/api";

export type FeedbackType = "academic" | "non_academic";
export type FeedbackStatus = "pending" | "in_review" | "assigned" | "working" | "resolved" | "rejected";
export type FeedbackPriority = "low" | "medium" | "high" | "urgent";

export interface Feedback {
  id: string;
  type: FeedbackType;
  category: string;
  subject: string;
  description: string;
  status: FeedbackStatus;
  priority: FeedbackPriority;
  isAnonymous: boolean;
  studentId: string;
  studentName?: string;
  createdAt: Date;
  updatedAt: Date;
  assignedTo?: string;
  assignedBy?: string;
  assignedAt?: Date;
  dueAt?: Date;
  department?: string;
  resolutionSummary?: string;
  attachments?: string[];
  internalNotes?: Array<{
    id: string;
    text: string;
    author: string;
    createdAt: Date;
  }>;
  statusHistory?: Array<{
    id: string;
    status: FeedbackStatus;
    timestamp: Date;
    updatedBy: string;
    note?: string;
  }>;
  similarityGroup?: string;
}

interface FeedbackContextType {
  feedbacks: Feedback[];
  submitFeedback: (
    feedback: Omit<Feedback, "id" | "status" | "priority" | "createdAt" | "updatedAt">,
  ) => Promise<void>;
  updateFeedbackStatus: (id: string, status: FeedbackStatus, resolutionSummary?: string) => Promise<void>;
  assignFeedback: (id: string, assignedTo: string, assignedBy: string, dueAt?: string) => Promise<void>;
  addInternalNote: (feedbackId: string, note: string, author: string) => Promise<void>;
  uploadAttachment: (feedbackId: string, file: File) => Promise<void>;
  checkProfanity: (text: string) => boolean;
  getUserFeedbacks: (userId: string) => Feedback[];
  getDepartmentFeedbacks: (department: string, type: FeedbackType) => Feedback[];
  getAssignedFeedbacks: (assignedTo: string) => Feedback[];
  getAllFeedbacks: () => Feedback[];
  refreshFeedbacks: () => Promise<void>;
}

type BackendFeedback = {
  id: string;
  type: FeedbackType;
  category: string;
  subject: string;
  description: string;
  status: FeedbackStatus;
  priority: FeedbackPriority;
  is_anonymous: boolean;
  student_id: string;
  student_name?: string | null;
  assigned_to_id?: string | null;
  assigned_by_id?: string | null;
  assigned_at?: string | null;
  due_at?: string | null;
  department?: string | null;
  resolution_summary?: string | null;
  similarity_group?: string | null;
  attachments?: string[];
  created_at: string;
  updated_at: string;
  notes?: Array<{
    id: string;
    author_id: string;
    text: string;
    created_at: string;
  }>;
  status_history?: Array<{
    id: string;
    status: FeedbackStatus;
    updated_by_id: string;
    note?: string | null;
    created_at: string;
  }>;
};

const FeedbackContext = createContext<FeedbackContextType | undefined>(undefined);

const profanityList = ["damn", "hell", "stupid", "idiot", "fool", "crap", "suck"];

function mapFeedback(input: BackendFeedback): Feedback {
  return {
    id: input.id,
    type: input.type,
    category: input.category,
    subject: input.subject,
    description: input.description,
    status: input.status,
    priority: input.priority,
    isAnonymous: input.is_anonymous,
    studentId: input.student_id,
    studentName: input.student_name || undefined,
    createdAt: new Date(input.created_at),
    updatedAt: new Date(input.updated_at),
    assignedTo: input.assigned_to_id || undefined,
    assignedBy: input.assigned_by_id || undefined,
    assignedAt: input.assigned_at ? new Date(input.assigned_at) : undefined,
    dueAt: input.due_at ? new Date(input.due_at) : undefined,
    department: input.department || undefined,
    resolutionSummary: input.resolution_summary || undefined,
    similarityGroup: input.similarity_group || undefined,
    attachments: input.attachments || [],
    internalNotes: (input.notes || []).map((note) => ({
      id: note.id,
      text: note.text,
      author: note.author_id,
      createdAt: new Date(note.created_at),
    })),
    statusHistory: (input.status_history || []).map((item) => ({
      id: item.id,
      status: item.status,
      timestamp: new Date(item.created_at),
      updatedBy: item.updated_by_id,
      note: item.note || undefined,
    })),
  };
}

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuth();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);

  const refreshFeedbacks = async () => {
    if (!token) {
      setFeedbacks([]);
      return;
    }

    try {
      const response = await apiRequest<{ items: BackendFeedback[]; total: number }>("/feedback", {
        token,
      });
      setFeedbacks(response.items.map(mapFeedback));
    } catch {
      setFeedbacks([]);
    }
  };

  useEffect(() => {
    void refreshFeedbacks();
  }, [token, user?.role]);

  const checkProfanity = (text: string): boolean => {
    const lowerText = text.toLowerCase();
    return profanityList.some((word) => lowerText.includes(word));
  };

  const submitFeedback = async (
    feedback: Omit<Feedback, "id" | "status" | "priority" | "createdAt" | "updatedAt">,
  ) => {
    if (!token) {
      throw new Error("Please log in to submit feedback.");
    }
    const created = await apiRequest<BackendFeedback>("/feedback", {
      method: "POST",
      token,
      body: {
        type: feedback.type,
        category: feedback.category,
        subject: feedback.subject,
        description: feedback.description,
        is_anonymous: feedback.isAnonymous,
        department: feedback.type === "academic" ? feedback.department : undefined,
      },
    });
    setFeedbacks((prev) => [mapFeedback(created), ...prev]);
  };

  const updateFeedbackStatus = async (id: string, status: FeedbackStatus, resolutionSummary?: string) => {
    if (!token) {
      throw new Error("Please log in first.");
    }
    const updated = await apiRequest<BackendFeedback>(`/feedback/${id}/status`, {
      method: "PATCH",
      token,
      body: { status, resolution_summary: resolutionSummary },
    });
    setFeedbacks((prev) => prev.map((item) => (item.id === id ? mapFeedback(updated) : item)));
  };

  const assignFeedback = async (id: string, assignedTo: string, assignedBy: string, dueAt?: string) => {
    if (!token) {
      throw new Error("Please log in first.");
    }
    const updated = await apiRequest<BackendFeedback>(`/feedback/${id}/assign`, {
      method: "POST",
      token,
      body: { assignee_id: assignedTo, note: `Assigned by ${assignedBy}`, due_at: dueAt },
    });
    setFeedbacks((prev) => prev.map((item) => (item.id === id ? mapFeedback(updated) : item)));
  };

  const addInternalNote = async (feedbackId: string, note: string, _author: string) => {
    if (!token) {
      throw new Error("Please log in first.");
    }
    const updated = await apiRequest<BackendFeedback>(`/feedback/${feedbackId}/notes`, {
      method: "POST",
      token,
      body: { text: note },
    });
    setFeedbacks((prev) => prev.map((item) => (item.id === feedbackId ? mapFeedback(updated) : item)));
  };

  const uploadAttachment = async (feedbackId: string, file: File) => {
    if (!token) {
      throw new Error("Please log in first.");
    }
    const formData = new FormData();
    formData.append("file", file);
    const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "") || "http://localhost:8000/api/v1";
    const response = await fetch(`${baseUrl}/feedback/${feedbackId}/attachments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    if (!response.ok) {
      let message = "Attachment upload failed";
      try {
        const data = await response.json();
        message = data.detail || message;
      } catch {
        // no-op
      }
      throw new Error(message);
    }
    const updated = (await response.json()) as BackendFeedback;
    setFeedbacks((prev) => prev.map((item) => (item.id === feedbackId ? mapFeedback(updated) : item)));
  };

  const filteredFeedbacks = useMemo(() => feedbacks, [feedbacks]);

  const getUserFeedbacks = (userId: string) => filteredFeedbacks.filter((feedback) => feedback.studentId === userId);

  const getDepartmentFeedbacks = (department: string, type: FeedbackType) =>
    filteredFeedbacks.filter((feedback) => feedback.department === department && feedback.type === type);

  const getAssignedFeedbacks = (assignedTo: string) => filteredFeedbacks.filter((feedback) => feedback.assignedTo === assignedTo);

  const getAllFeedbacks = () => filteredFeedbacks;

  return (
    <FeedbackContext.Provider
      value={{
        feedbacks,
        submitFeedback,
        updateFeedbackStatus,
        assignFeedback,
        addInternalNote,
        uploadAttachment,
        checkProfanity,
        getUserFeedbacks,
        getDepartmentFeedbacks,
        getAssignedFeedbacks,
        getAllFeedbacks,
        refreshFeedbacks,
      }}
    >
      {children}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (context === undefined) {
    throw new Error("useFeedback must be used within a FeedbackProvider");
  }
  return context;
}
