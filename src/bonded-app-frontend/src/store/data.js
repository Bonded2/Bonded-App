import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import useAuthStore from './auth';

const useDataStore = create(
  persist(
    (set, get) => ({
      // Relationships state
      relationships: [],
      pendingInvites: [],
      relationshipsLoading: false,
      relationshipsError: null,

      // Evidence vault state
      evidenceEntries: [],
      evidenceLoading: false,
      evidenceError: null,
      uploadProgress: {},

      // Filters and settings
      filters: {
        dateRange: null,
        source: null,
        contentType: null,
      },
      sortBy: 'created_at',
      sortOrder: 'desc',

      // Load relationships
      loadRelationships: async () => {
        set({ relationshipsLoading: true, relationshipsError: null });
        
        try {
          const { actor } = useAuthStore.getState();
          if (!actor) {
            throw new Error('Not authenticated');
          }

          const response = await actor.get_relationships();
          
          if (response.success) {
            set({
              relationships: response.data || [],
              relationshipsLoading: false,
            });
          } else {
            throw new Error(response.error);
          }
        } catch (error) {
          console.error('Load relationships error:', error);
          set({
            relationshipsError: error.message,
            relationshipsLoading: false,
          });
        }
      },

      // Create relationship
      createRelationship: async (targetUser, relationshipType, metadata = {}) => {
        set({ relationshipsLoading: true, relationshipsError: null });
        
        try {
          const { actor } = useAuthStore.getState();
          if (!actor) {
            throw new Error('Not authenticated');
          }

          const response = await actor.create_relationship({
            target_user: targetUser,
            relationship_type: relationshipType,
            metadata: Object.entries(metadata),
          });
          
          if (response.success) {
            set(state => ({
              relationships: [...state.relationships, response.data],
              relationshipsLoading: false,
            }));
            return response.data;
          } else {
            throw new Error(response.error);
          }
        } catch (error) {
          console.error('Create relationship error:', error);
          set({
            relationshipsError: error.message,
            relationshipsLoading: false,
          });
          throw error;
        }
      },

      // Load evidence timeline
      loadEvidenceTimeline: async () => {
        set({ evidenceLoading: true, evidenceError: null });
        
        try {
          const { actor } = useAuthStore.getState();
          if (!actor) {
            throw new Error('Not authenticated');
          }

          const response = await actor.get_evidence_timeline();
          
          if (response.success) {
            const sortedEvidence = (response.data || []).sort((a, b) => {
              const aValue = a[get().sortBy];
              const bValue = b[get().sortBy];
              
              if (get().sortOrder === 'desc') {
                return bValue - aValue;
              } else {
                return aValue - bValue;
              }
            });

            set({
              evidenceEntries: sortedEvidence,
              evidenceLoading: false,
            });
          } else {
            throw new Error(response.error);
          }
        } catch (error) {
          console.error('Load evidence timeline error:', error);
          set({
            evidenceError: error.message,
            evidenceLoading: false,
          });
        }
      },

      // Upload evidence
      uploadEvidence: async (fileData, metadata, uploadCycleId) => {
        const uploadId = Date.now().toString();
        
        set(state => ({
          evidenceLoading: true,
          evidenceError: null,
          uploadProgress: {
            ...state.uploadProgress,
            [uploadId]: { progress: 0, status: 'preparing' }
          }
        }));
        
        try {
          const { actor } = useAuthStore.getState();
          if (!actor) {
            throw new Error('Not authenticated');
          }

          // Update progress
          set(state => ({
            uploadProgress: {
              ...state.uploadProgress,
              [uploadId]: { progress: 25, status: 'encrypting' }
            }
          }));

          // Simulate file processing (in real implementation, this would include encryption)
          const processedData = fileData; // Placeholder for encryption
          const fileHash = await generateFileHash(fileData);

          // Update progress
          set(state => ({
            uploadProgress: {
              ...state.uploadProgress,
              [uploadId]: { progress: 50, status: 'uploading' }
            }
          }));

          const response = await actor.upload_evidence({
            encrypted_data: processedData,
            file_hash: fileHash,
            metadata,
            upload_cycle_id: uploadCycleId,
          });
          
          if (response.success) {
            set(state => ({
              evidenceEntries: [response.data, ...state.evidenceEntries],
              evidenceLoading: false,
              uploadProgress: {
                ...state.uploadProgress,
                [uploadId]: { progress: 100, status: 'completed' }
              }
            }));

            // Clean up upload progress after delay
            setTimeout(() => {
              set(state => {
                const newProgress = { ...state.uploadProgress };
                delete newProgress[uploadId];
                return { uploadProgress: newProgress };
              });
            }, 3000);

            return response.data;
          } else {
            throw new Error(response.error);
          }
        } catch (error) {
          console.error('Upload evidence error:', error);
          set(state => ({
            evidenceError: error.message,
            evidenceLoading: false,
            uploadProgress: {
              ...state.uploadProgress,
              [uploadId]: { progress: 0, status: 'error', error: error.message }
            }
          }));
          throw error;
        }
      },

      // Revoke evidence
      revokeEvidence: async (evidenceId) => {
        set({ evidenceLoading: true, evidenceError: null });
        
        try {
          const { actor } = useAuthStore.getState();
          if (!actor) {
            throw new Error('Not authenticated');
          }

          const response = await actor.revoke_evidence(evidenceId);
          
          if (response.success) {
            set(state => ({
              evidenceEntries: state.evidenceEntries.map(entry =>
                entry.id === evidenceId
                  ? { ...entry, is_revoked: true }
                  : entry
              ),
              evidenceLoading: false,
            }));
            return true;
          } else {
            throw new Error(response.error);
          }
        } catch (error) {
          console.error('Revoke evidence error:', error);
          set({
            evidenceError: error.message,
            evidenceLoading: false,
          });
          throw error;
        }
      },

      // Set filters
      setFilters: (newFilters) => {
        set(state => ({
          filters: { ...state.filters, ...newFilters }
        }));
        get().applyFilters();
      },

      // Set sorting
      setSorting: (sortBy, sortOrder) => {
        set({ sortBy, sortOrder });
        get().applyFilters();
      },

      // Apply filters and sorting
      applyFilters: () => {
        const { filters, sortBy, sortOrder } = get();
        
        set(state => {
          let filtered = [...state.evidenceEntries];

          // Apply date range filter
          if (filters.dateRange) {
            const { start, end } = filters.dateRange;
            filtered = filtered.filter(entry => {
              const entryDate = entry.created_at;
              return entryDate >= start && entryDate <= end;
            });
          }

          // Apply source filter
          if (filters.source) {
            filtered = filtered.filter(entry => 
              entry.metadata.source === filters.source
            );
          }

          // Apply content type filter
          if (filters.contentType) {
            filtered = filtered.filter(entry => 
              entry.metadata.file_type.includes(filters.contentType)
            );
          }

          // Apply sorting
          filtered.sort((a, b) => {
            const aValue = a[sortBy];
            const bValue = b[sortBy];
            
            if (sortOrder === 'desc') {
              return bValue - aValue;
            } else {
              return aValue - bValue;
            }
          });

          return { evidenceEntries: filtered };
        });
      },

      // Get filtered evidence entries
      getFilteredEvidence: () => {
        const { evidenceEntries, filters } = get();
        
        let filtered = evidenceEntries.filter(entry => !entry.is_revoked);

        if (filters.dateRange) {
          const { start, end } = filters.dateRange;
          filtered = filtered.filter(entry => {
            const entryDate = entry.created_at;
            return entryDate >= start && entryDate <= end;
          });
        }

        if (filters.source) {
          filtered = filtered.filter(entry => 
            entry.metadata.source === filters.source
          );
        }

        if (filters.contentType) {
          filtered = filtered.filter(entry => 
            entry.metadata.file_type.includes(filters.contentType)
          );
        }

        return filtered;
      },

      // Get evidence by upload cycle
      getEvidenceByUploadCycle: (uploadCycleId) => {
        return get().evidenceEntries.filter(entry => 
          entry.upload_cycle_id === uploadCycleId && !entry.is_revoked
        );
      },

      // Get evidence statistics
      getEvidenceStats: () => {
        const evidence = get().getFilteredEvidence();
        
        const stats = {
          total: evidence.length,
          sources: {},
          fileTypes: {},
          totalSize: 0,
          dateRange: null,
        };

        if (evidence.length === 0) return stats;

        let minDate = evidence[0].created_at;
        let maxDate = evidence[0].created_at;

        evidence.forEach(entry => {
          // Count sources
          const source = entry.metadata.source;
          stats.sources[source] = (stats.sources[source] || 0) + 1;

          // Count file types
          const fileType = entry.metadata.file_type.split('/')[0];
          stats.fileTypes[fileType] = (stats.fileTypes[fileType] || 0) + 1;

          // Sum file sizes
          stats.totalSize += entry.metadata.file_size;

          // Track date range
          if (entry.created_at < minDate) minDate = entry.created_at;
          if (entry.created_at > maxDate) maxDate = entry.created_at;
        });

        stats.dateRange = { start: minDate, end: maxDate };

        return stats;
      },

      // Clear errors
      clearRelationshipsError: () => set({ relationshipsError: null }),
      clearEvidenceError: () => set({ evidenceError: null }),

      // Reset store
      reset: () => set({
        relationships: [],
        pendingInvites: [],
        evidenceEntries: [],
        filters: {
          dateRange: null,
          source: null,
          contentType: null,
        },
        sortBy: 'created_at',
        sortOrder: 'desc',
        relationshipsError: null,
        evidenceError: null,
        uploadProgress: {},
      }),
    }),
    {
      name: 'bonded-data-storage',
      partialize: (state) => ({
        relationships: state.relationships,
        evidenceEntries: state.evidenceEntries,
        filters: state.filters,
        sortBy: state.sortBy,
        sortOrder: state.sortOrder,
      }),
    }
  )
);

// Utility function to generate file hash
async function generateFileHash(data) {
  if (typeof data === 'string') {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  // For binary data
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export default useDataStore;