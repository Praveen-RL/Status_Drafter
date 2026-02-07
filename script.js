/**
 * Status Drafter Tool - Main Logic (Connected to Node.js Backend)
 */

// --- State Management ---
const state = {
    mode: 'daily', // 'daily' or 'weekly'
    inputs: {
        userName: '',
        dateRange: '',
        taskTitle: '',
        progressStatus: 'In Progress',
        taskDesc: '',
        blockers: '',
        nextSteps: ''
    }
};

// --- API Service ---
const APIService = {
    baseUrl: 'http://localhost:3001/api',

    // Save a draft
    saveDraft: async (type, content, projectId, roleId) => {
        try {
            const response = await fetch(`${APIService.baseUrl}/drafts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, content, project_id: projectId, role_id: roleId })
            });
            return await response.json();
        } catch (error) {
            console.error("Save failed:", error);
            return { error: true, message: error.message };
        }
    },

    // Get history with limit
    getHistory: async (limit = 10) => {
        try {
            const response = await fetch(`${APIService.baseUrl}/drafts?limit=${limit}`);
            return await response.json();
        } catch (error) {
            console.error("Fetch failed:", error);
            return { error: true, data: [] };
        }
    },

    // Projects & Roles
    getProjects: async () => {
        const res = await fetch(`${APIService.baseUrl}/projects`);
        return await res.json();
    },

    createProject: async (name) => {
        const res = await fetch(`${APIService.baseUrl}/projects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        return await res.json();
    },

    deleteProject: async (id) => {
        const res = await fetch(`${APIService.baseUrl}/projects/${id}`, { method: 'DELETE' });
        return await res.json();
    },

    getRoles: async (projectId) => {
        const res = await fetch(`${APIService.baseUrl}/projects/${projectId}/roles`);
        return await res.json();
    },

    createRole: async (name, projectId) => {
        const res = await fetch(`${APIService.baseUrl}/roles`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, project_id: projectId })
        });
        return await res.json();
    },

    deleteRole: async (id) => {
        const res = await fetch(`${APIService.baseUrl}/roles/${id}`, { method: 'DELETE' });
        return await res.json();
    },

    // AI Enhance (Real)
    enhanceFields: async (fields) => {
        try {
            const response = await fetch(`${APIService.baseUrl}/enhance`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fields })
            });
            const data = await response.json();

            if (data.error) {
                console.error("AI Error:", data.details);
                return null;
            }
            return data.enhanced;

        } catch (error) {
            console.error("Network Error:", error);
            return null;
        }
    }
};

// --- Templates ---
const formatters = {
    daily: (data) => {
        const date = data.dateRange || new Date().toLocaleDateString();
        const blockerText = data.blockers ? `\nBlockers: ${data.blockers}` : '';
        const namePart = data.userName ? `[${data.userName}] ` : '';

        return `${namePart}Daily Update - ${date}

Task: ${data.taskTitle}
Status: ${data.progressStatus}

Done / In Progress:
${data.taskDesc}
${blockerText}
Next Steps:
${data.nextSteps}`;
    },

    weekly: (data) => {
        const date = data.dateRange || 'This Week';
        const namePart = data.userName ? `Author: ${data.userName}\n` : '';

        return `Weekly Summary (${date})
${namePart}
━━━━━━━━━━━━━━━━━━━━━━━━━━
Key Highlight:
${data.taskTitle}

Work Accomplished:
${data.taskDesc}

Challenges / Blockers:
${data.blockers || "None"}

Focus for Next Week:
${data.nextSteps}
━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    }
};

// --- UI Controller ---
class UIController {
    constructor() {
        this.dom = {
            form: document.getElementById('statusForm'),
            inputs: {
                userName: document.getElementById('userName'),
                dateRange: document.getElementById('dateRange'),
                taskTitle: document.getElementById('taskTitle'),
                progressStatus: document.getElementById('progressStatus'),
                taskDesc: document.getElementById('taskDesc'),
                blockers: document.getElementById('blockers'),
                nextSteps: document.getElementById('nextSteps'),
            },
            selects: {
                project: document.getElementById('projectSelect'),
                role: document.getElementById('roleSelect')
            },
            output: document.getElementById('outputPreview'),
            toggles: document.querySelectorAll('.toggle-btn'),
            blockerGroup: document.getElementById('blockerGroup'),
            historyList: document.getElementById('historyList'),
            buttons: {
                save: document.getElementById('saveBtn'),
                copy: document.getElementById('copyBtn'),
                enhance: document.getElementById('enhanceBtn'),
                email: document.getElementById('emailBtn'),
                slack: document.getElementById('slackBtn'),
            },
            toast: document.getElementById('toast'),

            // Dashboard Elements
            navButtons: document.querySelectorAll('.nav-btn'),
            sections: {
                editor: document.getElementById('editorSection'),
                dashboard: document.getElementById('dashboardSection'),
                settings: document.getElementById('settingsSection')
            },
            dashboard: {
                searchInput: document.getElementById('searchInput'),
                filterType: document.getElementById('filterType'),
                filterProject: document.getElementById('filterProject'),
                filterTimeframe: document.getElementById('filterTimeframe'),
                filterDate: document.getElementById('filterDate'),
                sortOrder: document.getElementById('sortOrder'),
                tableBody: document.getElementById('dashboardTableBody')
            },
            settings: {
                projectsList: document.getElementById('projectsList'),
                rolesList: document.getElementById('rolesList'),
                newProjectName: document.getElementById('newProjectName'),
                addProjectBtn: document.getElementById('addProjectBtn'),
                newRoleName: document.getElementById('newRoleName'),
                addRoleBtn: document.getElementById('addRoleBtn')
            }
        };

        this.allDrafts = []; // Store fetched drafts
        this.init();
    }

    init() {
        this.updateDatePlaceholder();
        this.bindEvents();
        this.updatePreview(); // Initial render
        this.loadHistory();   // Load from DB
        this.loadProjects();  // Load projects for filters/settings
    }

    updateDatePlaceholder() {
        // Helper to format as DD/MM/YYYY
        const formatDate = (date) => {
            const d = date.getDate().toString().padStart(2, '0');
            const m = (date.getMonth() + 1).toString().padStart(2, '0');
            const y = date.getFullYear();
            return `${d}/${m}/${y}`;
        };

        const now = new Date();
        if (state.mode === 'daily') {
            this.dom.inputs.dateRange.value = formatDate(now);
        } else {
            const first = now.getDate() - now.getDay() + 1; // Monday
            const last = first + 4; // Friday

            const start = new Date(now);
            start.setDate(first);

            const end = new Date(now);
            end.setDate(last);

            this.dom.inputs.dateRange.value = `${formatDate(start)} - ${formatDate(end)}`;
        }
        // Update state immediately so preview reflects the new default date
        state.inputs.dateRange = this.dom.inputs.dateRange.value;
    }

    bindEvents() {
        // Navigation Logic
        this.dom.navButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.dataset.view;

                // Update Buttons
                this.dom.navButtons.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');

                // Update Sections
                // Hide all first
                Object.values(this.dom.sections).forEach(s => {
                    if (s) s.classList.add('hidden');
                });

                // Show selected
                if (view === 'editor') {
                    this.dom.sections.editor.classList.remove('hidden');
                } else if (view === 'dashboard') {
                    this.dom.sections.dashboard.classList.remove('hidden');
                    this.loadDashboardData();
                } else if (view === 'settings') {
                    this.dom.sections.settings.classList.remove('hidden');
                    // Ensure settings projects are rendered
                    this.renderSettingsProjects();
                }
            });
        });

        // Settings Events
        if (this.dom.settings.addProjectBtn) {
            this.dom.settings.addProjectBtn.addEventListener('click', () => this.handleAddProject());
        }
        if (this.dom.settings.addRoleBtn) {
            this.dom.settings.addRoleBtn.addEventListener('click', () => this.handleAddRole());
        }

        // Dashboard Controls
        if (this.dom.dashboard.searchInput) {
            const d = this.dom.dashboard;
            d.searchInput.addEventListener('input', () => this.renderDashboard());
            d.filterType.addEventListener('change', () => this.renderDashboard());
            d.sortOrder.addEventListener('change', () => this.renderDashboard());

            // New Filters
            if (d.filterProject) d.filterProject.addEventListener('change', () => this.renderDashboard());
            if (d.filterTimeframe) {
                d.filterTimeframe.addEventListener('change', (e) => {
                    if (e.target.value === 'custom') {
                        d.filterDate.classList.remove('hidden');
                    } else {
                        d.filterDate.classList.add('hidden');
                    }
                    this.renderDashboard();
                });
            }
            if (d.filterDate) d.filterDate.addEventListener('change', () => this.renderDashboard());
        }

        this.dom.toggles.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.dom.toggles.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                state.mode = e.target.dataset.mode;
                this.updateDatePlaceholder();
                this.updatePreview();
            });
        });

        Object.values(this.dom.inputs).forEach(input => {
            input.addEventListener('input', (e) => {
                const key = e.target.id;
                state.inputs[key] = e.target.value;
                this.handleConditionalInputs();
                this.updatePreview();
            });
        });

        this.dom.buttons.save.addEventListener('click', () => this.saveDraft());
        this.dom.buttons.copy.addEventListener('click', () => this.copyToClipboard());
        this.dom.buttons.enhance.addEventListener('click', () => this.enhanceContent());
        this.dom.buttons.email.addEventListener('click', () => this.exportToEmail());
        this.dom.buttons.slack.addEventListener('click', () => this.exportToSlack());
    }

    handleConditionalInputs() {
        if (this.dom.inputs.progressStatus.value === 'Blocked' || this.dom.inputs.blockers.value) {
            this.dom.blockerGroup.style.display = 'block';
        } else {
            this.dom.blockerGroup.style.display = 'none';
        }
    }

    updatePreview() {
        const text = formatters[state.mode](state.inputs);
        this.dom.output.value = text;
    }

    // --- Backend Interactions ---

    async saveDraft() {
        const content = this.dom.output.value;
        const type = state.mode;

        this.dom.buttons.save.innerText = "Saving...";
        const result = await APIService.saveDraft(type, content);

        if (result.error) {
            this.showToast("Failed to save (Is server running?) ❌");
        } else {
            this.showToast("Draft Saved to DB! 💾");
            this.loadHistory(); // Refresh list
        }
        this.dom.buttons.save.innerText = "💾 Save Draft";
    }

    async loadHistory() {
        const result = await APIService.getHistory(5);
        const list = this.dom.historyList;
        list.innerHTML = '';

        if (!result.data || result.data.length === 0) {
            list.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem;">No history found.</p>';
            return;
        }

        result.data.forEach(item => {
            const div = document.createElement('div');
            div.className = 'history-item';
            div.style.cssText = `
                background: rgba(255,255,255,0.05); 
                padding: 0.5rem; 
                margin-bottom: 0.5rem; 
                border-radius: 6px; 
                font-size: 0.85rem; 
                cursor: pointer;
                border: 1px solid transparent;
            `;
            div.innerHTML = `<strong>${item.type.toUpperCase()}</strong> - ${new Date(item.created_at).toLocaleString()}`;

            div.addEventListener('click', () => {
                this.dom.output.value = item.content;
                this.showToast("Loaded draft from history!");
            });

            // Hover effect
            div.onmouseover = () => div.style.borderColor = 'var(--primary-color)';
            div.onmouseout = () => div.style.borderColor = 'transparent';

            list.appendChild(div);
        });
    }

    async enhanceContent() {
        const fields = {
            taskTitle: this.dom.inputs.taskTitle.value,
            taskDesc: this.dom.inputs.taskDesc.value,
            blockers: this.dom.inputs.blockers.value,
            nextSteps: this.dom.inputs.nextSteps.value
        };

        // Don't enhance if everything is empty
        if (!Object.values(fields).some(val => val.trim())) {
            this.showToast("Please enter some text first! 📝");
            return;
        }

        this.dom.buttons.enhance.innerText = "✨ Enhancing All...";
        this.dom.buttons.enhance.disabled = true;

        const improvedFields = await APIService.enhanceFields(fields);

        if (improvedFields) {
            // Update UI and State
            if (improvedFields.taskTitle) {
                this.dom.inputs.taskTitle.value = improvedFields.taskTitle;
                state.inputs.taskTitle = improvedFields.taskTitle;
            }
            if (improvedFields.taskDesc) {
                this.dom.inputs.taskDesc.value = improvedFields.taskDesc;
                state.inputs.taskDesc = improvedFields.taskDesc;
            }
            if (improvedFields.blockers) {
                this.dom.inputs.blockers.value = improvedFields.blockers;
                state.inputs.blockers = improvedFields.blockers;
            }
            if (improvedFields.nextSteps) {
                this.dom.inputs.nextSteps.value = improvedFields.nextSteps;
                state.inputs.nextSteps = improvedFields.nextSteps;
            }

            this.updatePreview();
            this.showToast("All fields enhanced! ✨");
        } else {
            this.showToast("Enhancement failed. Try again.");
        }

        this.dom.buttons.enhance.innerText = "✨ AI Enhance";
        this.dom.buttons.enhance.disabled = false;
    }

    // --- Dashboard Methods ---

    async loadDashboardData() {
        const result = await APIService.getHistory(100); // Fetch more for dashboard
        if (result.data) {
            this.allDrafts = result.data;
            this.renderDashboard();
        }
    }

    renderDashboard() {
        const tbody = this.dom.dashboard.tableBody;
        tbody.innerHTML = '';

        const searchText = this.dom.dashboard.searchInput.value.toLowerCase();
        const filterType = this.dom.dashboard.filterType.value;
        const sortOrder = this.dom.dashboard.sortOrder.value;

        // Date Helpers
        const now = new Date();
        const startOfThisWeek = new Date(now);
        const day = startOfThisWeek.getDay() || 7; // Get current day number, converting Sun. to 7
        if (day !== 1) startOfThisWeek.setHours(-24 * (day - 1));
        startOfThisWeek.setHours(0, 0, 0, 0);

        const startOfLastWeek = new Date(startOfThisWeek);
        startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
        const endOfLastWeek = new Date(startOfThisWeek);
        endOfLastWeek.setMilliseconds(-1);

        const timeframe = this.dom.dashboard.filterTimeframe ? this.dom.dashboard.filterTimeframe.value : 'all';
        const filterDate = this.dom.dashboard.filterDate ? this.dom.dashboard.filterDate.value : '';
        const filterProject = this.dom.dashboard.filterProject ? this.dom.dashboard.filterProject.value : 'all';

        // Filter
        let filtered = this.allDrafts.filter(item => {
            const itemDate = new Date(item.created_at);
            const itemDateStr = itemDate.toISOString().split('T')[0];

            // 1. Text Search
            const matchesSearch = item.content.toLowerCase().includes(searchText) ||
                item.type.toLowerCase().includes(searchText) ||
                (item.project_name && item.project_name.toLowerCase().includes(searchText));

            // 2. Type Filter
            const matchesType = filterType === 'all' || item.type === filterType;

            // 3. Project Filter
            const matchesProject = filterProject === 'all' || (item.project_id && item.project_id.toString() === filterProject);

            // 4. Timeframe Filter
            let matchesTime = true;
            if (timeframe === 'this_week') {
                matchesTime = itemDate >= startOfThisWeek;
            } else if (timeframe === 'last_week') {
                matchesTime = itemDate >= startOfLastWeek && itemDate <= endOfLastWeek;
            } else if (timeframe === 'custom' && filterDate) {
                matchesTime = itemDateStr === filterDate;
            }

            return matchesSearch && matchesType && matchesProject && matchesTime;
        });

        // Sort
        filtered.sort((a, b) => {
            const dateA = new Date(a.created_at);
            const dateB = new Date(b.created_at);
            return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });

        // Render
        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: var(--text-muted);">No drafts found.</td></tr>`;
            return;
        }

        filtered.forEach(item => {
            const row = document.createElement('tr');

            // Extract a title from the content block
            let summary = "Untitled Draft";
            const lines = item.content.split('\n');

            // Try to find a meaningful line: "Task:", "Highlight:", or just the first non-empty line after title
            const taskLine = lines.find(l => l.startsWith('Task:'));
            const highlightLine = lines.find(l => l.startsWith('Highlight:'));

            if (taskLine) {
                summary = taskLine.replace('Task:', '').trim();
            } else if (highlightLine) {
                summary = highlightLine.replace('Highlight:', '').trim();
            } else if (lines.length > 0) {
                // Fallback: Use first line but remove generic headers
                summary = lines[0].replace(/Daily Update.*|Weekly Summary.*/, '').trim() || lines[1] || "Untitled";
            }
            if (summary.length > 60) summary = summary.substring(0, 60) + "...";

            // Project badge
            const projectBadge = item.project_name ?
                `<span style="background: rgba(99, 102, 241, 0.2); color: #818cf8; padding: 2px 6px; border-radius: 4px; font-size: 0.8rem; margin-right: 5px;">${item.project_name}</span>` : '';

            row.innerHTML = `
                <td>${new Date(item.created_at).toLocaleDateString()}</td>
                <td><span style="text-transform: capitalize; background: rgba(255,255,255,0.1); padding: 2px 8px; border-radius: 4px;">${item.type}</span></td>
                <td>${projectBadge}${summary}</td>
                <td>
                    <button class="action-btn btn-load">📝 Load</button>
                    <button class="action-btn btn-delete">🗑️</button>
                </td>
            `;

            // Actions
            row.querySelector('.btn-load').addEventListener('click', () => {
                this.loadDraftToEditor(item.content, item.type);
            });

            row.querySelector('.btn-delete').addEventListener('click', async () => {
                if (confirm('Are you sure you want to delete this draft?')) {
                    await this.deleteDraft(item.id);
                }
            });

            tbody.appendChild(row);
        });
    }

    async deleteDraft(id) {
        try {
            const response = await fetch(`${APIService.baseUrl}/drafts/${id}`, { method: 'DELETE' });
            const data = await response.json();
            if (data.message === 'deleted') {
                this.showToast("Draft deleted 🗑️");
                this.loadDashboardData(); // Refresh
            }
        } catch (error) {
            console.error(error);
            this.showToast("Delete failed ❌");
        }
    }

    loadDraftToEditor(content, type) {
        // Switch to Editor View
        this.dom.navButtons[0].click();

        // Switch Mode
        state.mode = type;
        const toggle = Array.from(this.dom.toggles).find(t => t.dataset.mode === type);
        if (toggle) toggle.click();

        // Populate Preview
        this.dom.output.value = content;
        this.showToast("Draft Loaded! (Note: Only Preview is restored)");
    }

    // --- Project & Role Management ---

    async loadProjects() {
        const result = await APIService.getProjects();
        if (result.data) {
            this.projects = result.data;
            this.renderProjectSelects();
            this.renderSettingsProjects();
        }
    }

    renderProjectSelects() {
        const options = `<option value="">Select Project...</option>` +
            this.projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('');

        // Editor Dropdown
        this.dom.selects.project.innerHTML = options;

        // Dashboard Filter
        const filterOptions = `<option value="all">All Projects</option>` +
            this.projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
        this.dom.dashboard.filterProject.innerHTML = filterOptions;
    }

    async loadRolesToSelect(projectId) {
        const roleSelect = this.dom.selects.role;
        roleSelect.innerHTML = `<option value="">Select Role...</option>`;

        if (!projectId) {
            roleSelect.disabled = true;
            return;
        }

        const result = await APIService.getRoles(projectId);
        if (result.data) {
            roleSelect.innerHTML += result.data.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
            roleSelect.disabled = false;
        }
    }

    // Settings UI Logic
    renderSettingsProjects() {
        const list = this.dom.settings.projectsList;
        list.innerHTML = '';
        this.projects.forEach(p => {
            const li = document.createElement('li');
            li.className = `settings-item ${this.currentSettingsProject === p.id ? 'selected' : ''}`;
            li.innerHTML = `<span>${p.name}</span> <button class="delete-icon">✖</button>`;

            li.addEventListener('click', (e) => {
                if (e.target.classList.contains('delete-icon')) {
                    this.handleDeleteProject(p.id);
                } else {
                    // Select for role management
                    this.currentSettingsProject = p.id;
                    this.renderSettingsProjects(); // Refresh selection visual
                    this.loadSettingsRoles(p.id);
                }
            });
            list.appendChild(li);
        });
    }

    async handleAddProject() {
        const name = this.dom.settings.newProjectName.value.trim();
        if (!name) return;

        await APIService.createProject(name);
        this.dom.settings.newProjectName.value = '';
        this.loadProjects();
        this.showToast("Project Added");
    }

    async handleDeleteProject(id) {
        if (!confirm("Delete this project?")) return;
        await APIService.deleteProject(id);
        if (this.currentSettingsProject === id) {
            this.currentSettingsProject = null;
            this.dom.settings.rolesList.innerHTML = '';
        }
        this.loadProjects();
    }

    async loadSettingsRoles(projectId) {
        // Enable input
        this.dom.settings.newRoleName.disabled = false;
        this.dom.settings.addRoleBtn.disabled = false;
        this.dom.settings.newRoleName.placeholder = "New Role Name";

        const result = await APIService.getRoles(projectId);
        const list = this.dom.settings.rolesList;
        list.innerHTML = '';

        if (result.data) {
            result.data.forEach(r => {
                const li = document.createElement('li');
                li.className = 'settings-item';
                li.innerHTML = `<span>${r.name}</span> <button class="delete-icon">✖</button>`;
                li.querySelector('.delete-icon').addEventListener('click', () => this.handleDeleteRole(r.id));
                list.appendChild(li);
            });
        }
    }

    async handleAddRole() {
        const name = this.dom.settings.newRoleName.value.trim();
        if (!name || !this.currentSettingsProject) return;

        await APIService.createRole(name, this.currentSettingsProject);
        this.dom.settings.newRoleName.value = '';
        this.loadSettingsRoles(this.currentSettingsProject);
        this.showToast("Role Added");
    }

    async handleDeleteRole(id) {
        if (!confirm("Delete role?")) return;
        await APIService.deleteRole(id);
        this.loadSettingsRoles(this.currentSettingsProject);
    }


    copyToClipboard() {
        this.dom.output.select();
        document.execCommand('copy');
        this.showToast("Copied! 📋");
    }

    exportToEmail() {
        const subject = `${state.mode === 'daily' ? 'Daily Update' : 'Weekly Summary'}`;
        const body = encodeURIComponent(this.dom.output.value);
        window.location.href = `mailto:?subject=${subject}&body=${body}`;
    }

    exportToSlack() {
        this.dom.output.value = "```\n" + this.dom.output.value + "\n```";
        this.copyToClipboard();
        this.showToast("Formatted for Slack! 💬");
        setTimeout(() => this.updatePreview(), 2000);
    }

    showToast(msg) {
        this.dom.toast.textContent = msg;
        this.dom.toast.classList.remove('hidden');
        setTimeout(() => this.dom.toast.classList.add('hidden'), 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new UIController();
});
