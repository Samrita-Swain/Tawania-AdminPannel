"use client";

import { format } from "date-fns";

interface CustomerNote {
  id: string;
  customerId: string;
  note: string;
  createdById: string;
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  };
  createdAt: Date;
}

interface CustomerNotesListProps {
  notes: CustomerNote[];
}

export function CustomerNotesList({ notes }: CustomerNotesListProps) {
  if (notes.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-gray-300">
        <p className="text-gray-800">No notes found</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {notes.map((note) => (
        <div
          key={note.id}
          className="rounded-lg border border-gray-200 p-4"
        >
          <p className="whitespace-pre-line text-gray-800">{note.note}</p>
          <div className="mt-2 flex items-center justify-between text-xs text-gray-800">
            <span>
              Added by {note.createdBy.name || note.createdBy.email}
            </span>
            <span>
              {format(new Date(note.createdAt), "MMM d, yyyy h:mm a")}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
