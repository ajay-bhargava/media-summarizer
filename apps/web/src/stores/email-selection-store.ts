import { create } from "zustand";

interface EmailSelectionStore {
	selectedEmailIds: Set<string>;
	toggleEmail: (id: string) => void;
	clearSelection: () => void;
	getSelectedCount: () => number;
}

export const useEmailSelectionStore = create<EmailSelectionStore>(
	(set, get) => ({
		selectedEmailIds: new Set<string>(),
		toggleEmail: (id: string) => {
			set((state) => {
				const newSet = new Set(state.selectedEmailIds);
				if (newSet.has(id)) {
					newSet.delete(id);
				} else {
					newSet.add(id);
				}
				return { selectedEmailIds: newSet };
			});
		},
		clearSelection: () => {
			set({ selectedEmailIds: new Set<string>() });
		},
		getSelectedCount: () => {
			return get().selectedEmailIds.size;
		},
	}),
);
