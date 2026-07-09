import { apiRequest } from "./queryClient";

export const api = {
  // Events
  getEvents: () => fetch("/api/events").then(res => res.json()),
  getEvent: (id: string) => fetch(`/api/events/${id}`).then(res => res.json()),
  createEvent: (data: FormData) => apiRequest("POST", "/api/events", data),
  updateEvent: (id: string, data: FormData) => apiRequest("PATCH", `/api/events/${id}`, data),
  deleteEvent: (id: string) => apiRequest("DELETE", `/api/events/${id}`),

  // Users
  getUsers: () => fetch("/api/users").then(res => res.json()),

  // Clients
  getClients: () => fetch("/api/clients").then(res => res.json()),
  getClient: (id: string) => fetch(`/api/clients/${id}`).then(res => res.json()),
  createClient: (data: any) => apiRequest("POST", "/api/clients", data),

  // Vendors
  getVendors: (eventId: string) => fetch(`/api/events/${eventId}/vendors`).then(res => res.json()),
  createVendor: (eventId: string, data: any) => apiRequest("POST", `/api/events/${eventId}/vendors`, data),
  updateVendor: (id: string, data: any) => apiRequest("PATCH", `/api/vendors/${id}`, data),
  deleteVendor: (id: string) => apiRequest("DELETE", `/api/vendors/${id}`),

  // Tasks
  getTasks: (eventId: string) => fetch(`/api/events/${eventId}/tasks`).then(res => res.json()),
  createTask: (eventId: string, data: any) => apiRequest("POST", `/api/events/${eventId}/tasks`, data),
  updateTask: (id: string, data: any) => apiRequest("PATCH", `/api/tasks/${id}`, data),
  deleteTask: (id: string) => apiRequest("DELETE", `/api/tasks/${id}`),

  // Budget
  getBudgetItems: (eventId: string) => fetch(`/api/events/${eventId}/budget`).then(res => res.json()),
  createBudgetItem: (eventId: string, data: any) => apiRequest("POST", `/api/events/${eventId}/budget`, data),
  updateBudgetItem: (id: string, data: any) => apiRequest("PATCH", `/api/budget/${id}`, data),
  deleteBudgetItem: (id: string) => apiRequest("DELETE", `/api/budget/${id}`),

  // Contracts
  getContracts: (eventId: string) => fetch(`/api/events/${eventId}/contracts`).then(res => res.json()),
  createContract: (eventId: string, data: FormData) => apiRequest("POST", `/api/events/${eventId}/contracts`, data),
  updateContract: (id: string, data: FormData) => apiRequest("PATCH", `/api/contracts/${id}`, data),
  deleteContract: (id: string) => apiRequest("DELETE", `/api/contracts/${id}`),
};
