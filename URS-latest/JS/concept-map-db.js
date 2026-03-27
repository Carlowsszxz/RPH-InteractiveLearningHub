/**
 * Concept Map Database Operations
 * Handles all Supabase database interactions for the concept map
 */

const ConceptMapDB = {
    /**
     * Fetch all active concept maps
     */
    async getConceptMaps() {
        try {
            const { data, error } = await window.supabaseClient
                .from('concept_maps')
                .select('*')
                .eq('is_active', true)
                .order('root_word', { ascending: true });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error fetching concept maps:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Fetch all nodes for a specific map
     */
    async getMapNodes(mapId) {
        try {
            const { data, error } = await window.supabaseClient
                .from('concept_nodes_with_users')
                .select('*')
                .eq('map_id', mapId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error fetching map nodes:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Check if current user has already added a word to this map
     */
    async getUserNodeForMap(mapId, userId) {
        try {
            const { data, error } = await window.supabaseClient
                .from('concept_nodes')
                .select('*')
                .eq('map_id', mapId)
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
                throw error;
            }
            
            return { success: true, data: data || null };
        } catch (error) {
            console.error('Error checking user node:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Add a new node to the concept map
     */
    async addNode(mapId, userId, nodeData) {
        try {
            const { data, error } = await window.supabaseClient
                .from('concept_nodes')
                .insert([{
                    map_id: mapId,
                    user_id: userId,
                    word: nodeData.word,
                    color: nodeData.color || '#4A90E2',
                    parent_id: nodeData.parentId === 'root' ? null : nodeData.parentId,
                    relationship_label: nodeData.relationship || null,
                    position_x: nodeData.position_x || null,
                    position_y: nodeData.position_y || null
                }])
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error adding node:', error);
            
            // Handle unique constraint violation (user already has a word for this map)
            if (error.code === '23505') {
                return { 
                    success: false, 
                    error: 'You have already added a word to this concept map.' 
                };
            }
            
            return { success: false, error: error.message };
        }
    },

    /**
     * Update an existing node
     */
    async updateNode(nodeId, userId, updates) {
        try {
            const { data, error } = await window.supabaseClient
                .from('concept_nodes')
                .update({
                    word: updates.word,
                    color: updates.color,
                    parent_id: updates.parentId === 'root' ? null : updates.parentId,
                    relationship_label: updates.relationship,
                    position_x: updates.position_x,
                    position_y: updates.position_y
                })
                .eq('id', nodeId)
                .eq('user_id', userId) // Ensure user owns this node
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error updating node:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Update only the position of a node (for drag & drop)
     */
    async updateNodePosition(nodeId, userId, positionX, positionY) {
        try {
            const { error } = await window.supabaseClient
                .from('concept_nodes')
                .update({
                    position_x: positionX,
                    position_y: positionY
                })
                .eq('id', nodeId)
                .eq('user_id', userId);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Error updating node position:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Delete a node
     */
    async deleteNode(nodeId, userId) {
        try {
            const { error } = await window.supabaseClient
                .from('concept_nodes')
                .delete()
                .eq('id', nodeId)
                .eq('user_id', userId);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Error deleting node:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Get statistics for a concept map
     */
    async getMapStats(mapId) {
        try {
            const { count, error } = await window.supabaseClient
                .from('concept_nodes')
                .select('*', { count: 'exact', head: true })
                .eq('map_id', mapId);

            if (error) throw error;
            return { success: true, totalNodes: count };
        } catch (error) {
            console.error('Error fetching map stats:', error);
            return { success: false, error: error.message };
        }
    }
};
