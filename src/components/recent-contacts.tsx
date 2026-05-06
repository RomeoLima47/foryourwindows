"use client";

import React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import type { Id } from "../../convex/_generated/dataModel";

interface RecentContactsProps {
  onSelect: (email: string) => void;
  excludeEmails?: string[];
}

export function RecentContacts({ onSelect, excludeEmails = [] }: RecentContactsProps) {
  const contacts = useQuery(api.recentContacts.list);
  const toggleFavorite = useMutation(api.recentContacts.toggleFavorite);
  const removeContact = useMutation(api.recentContacts.remove);

  if (!contacts || contacts.length === 0) return null;

  const filtered = contacts.filter((c) => !excludeEmails.includes(c.email));
  if (filtered.length === 0) return null;

  const favorites = filtered.filter((c) => c.isFavorite);
  const recent = filtered.filter((c) => !c.isFavorite).slice(0, 5);

  return (
    <div className="space-y-2">
      {/* Favorites */}
      {favorites.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] font-medium uppercase text-muted-foreground">⭐ Favorites</p>
          <div className="flex flex-wrap gap-1.5">
            {favorites.map((contact) => (
              <ContactChip
                key={contact._id}
                contact={contact}
                onSelect={onSelect}
                onToggleFavorite={() => toggleFavorite({ id: contact._id })}
                onRemove={() => removeContact({ id: contact._id })}
              />
            ))}
          </div>
        </div>
      )}

      {/* Recent */}
      {recent.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] font-medium uppercase text-muted-foreground">🕐 Recent</p>
          <div className="flex flex-wrap gap-1.5">
            {recent.map((contact) => (
              <ContactChip
                key={contact._id}
                contact={contact}
                onSelect={onSelect}
                onToggleFavorite={() => toggleFavorite({ id: contact._id })}
                onRemove={() => removeContact({ id: contact._id })}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface ContactChipProps {
  contact: {
    _id: Id<"recentContacts">;
    email: string;
    name?: string;
    isFavorite: boolean;
  };
  onSelect: (email: string) => void;
  onToggleFavorite: () => void;
  onRemove: () => void;
}

function ContactChip({ contact, onSelect, onToggleFavorite, onRemove }: ContactChipProps) {
  return (
    <div className="group relative flex items-center gap-1 rounded-full border bg-card px-2 py-1 text-xs transition-colors hover:bg-muted">
      <button
        onClick={onSelect.bind(null, contact.email)}
        className="flex items-center gap-1"
        title={`Invite ${contact.email}`}
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary">
          {(contact.name ?? contact.email).charAt(0).toUpperCase()}
        </span>
        <span className="max-w-[120px] truncate">
          {contact.name ?? contact.email.split("@")[0]}
        </span>
      </button>

      {/* Hover actions */}
      <div className="hidden items-center gap-0.5 group-hover:flex">
        <button
          onClick={(e: React.MouseEvent) => { e.stopPropagation(); onToggleFavorite(); }}
          className="h-4 w-4 text-[10px]"
          title={contact.isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          {contact.isFavorite ? "⭐" : "☆"}
        </button>
        <button
          onClick={(e: React.MouseEvent) => { e.stopPropagation(); onRemove(); }}
          className="h-4 w-4 text-[10px] text-muted-foreground hover:text-red-500"
          title="Remove contact"
        >
          ×
        </button>
      </div>
    </div>
  );
}
