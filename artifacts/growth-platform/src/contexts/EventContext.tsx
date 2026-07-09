import { createContext, useContext, useState, ReactNode } from "react";

interface EventContextType {
  selectedEventId: string | null;
  setSelectedEventId: (id: string | null) => void;
}

const EventContext = createContext<EventContextType>({
  selectedEventId: null,
  setSelectedEventId: () => {},
});

export function EventProvider({ children }: { children: ReactNode }) {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  return (
    <EventContext.Provider value={{ selectedEventId, setSelectedEventId }}>
      {children}
    </EventContext.Provider>
  );
}

export function useEventContext() {
  return useContext(EventContext);
}
