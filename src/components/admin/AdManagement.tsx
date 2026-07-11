"use client";
import { useState } from "react";
import { Save } from "lucide-react";

const SLOT_NAMES: Record<string, string> = {
  header: "Под шапкой",
  sidebar: "Сайдбар тайтла",
  "in-player": "Над/под плеером",
  "between-cards": "Между карточками",
};

interface AdSlotData {
  id: string;
  slot: string;
  code: string;
  isActive: boolean;
}

export function AdManagement({ initialSlots }: { initialSlots: AdSlotData[] }) {
  const [slots, setSlots] = useState<Record<string, AdSlotData>>(
    Object.fromEntries(initialSlots.map((s) => [s.slot, s]))
  );
  const [saving, setSaving] = useState<string | null>(null);

  async function save(slotName: string) {
    setSaving(slotName);
    const slot = slots[slotName] || { id: "", slot: slotName, code: "", isActive: true };
    await fetch("/api/admin/ads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(slot),
    });
    setSaving(null);
  }

  const allSlots = ["header", "sidebar", "in-player", "between-cards"];

  return (
    <div className="space-y-6">
      {allSlots.map((slotName) => {
        const slot = slots[slotName] || { id: "", slot: slotName, code: "", isActive: true };
        return (
          <div key={slotName} className="bg-gray-900 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">{SLOT_NAMES[slotName] || slotName}</h3>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={slot.isActive}
                  onChange={(e) => setSlots((p) => ({ ...p, [slotName]: { ...slot, isActive: e.target.checked } }))}
                  className="w-4 h-4 accent-purple-500" />
                Активен
              </label>
            </div>
            <textarea
              value={slot.code}
              onChange={(e) => setSlots((p) => ({ ...p, [slotName]: { ...slot, code: e.target.value } }))}
              placeholder="Вставьте HTML-код рекламы..."
              rows={4}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-purple-500 resize-y"
            />
            <button onClick={() => save(slotName)} disabled={saving === slotName}
              className="mt-2 flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm transition-colors">
              <Save size={14} /> {saving === slotName ? "Сохраняем..." : "Сохранить"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
