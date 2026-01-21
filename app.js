    // SECTION 6: Detect localStorage availability
    function checkStorageAvailability() {
      try {
        const test = '__storage_test__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
      } catch (e) {
        return false;
      }
    }
    
    const STORAGE_AVAILABLE = checkStorageAvailability();
    
    // SECTION 6: Show warning if storage unavailable
    if (!STORAGE_AVAILABLE) {
      document.getElementById('storageWarning').classList.add('visible');
      document.getElementById('acknowledgeStorageWarning').addEventListener('click', () => {
        document.getElementById('storageWarning').classList.remove('visible');
        sessionStorage.setItem('storage_warning_acknowledged', 'true');
      });
    }
    
    // Initialize Application State
    const APP = {
      projects: [],
      currentIndex: null,
      role: 'reviewer',
      persist: STORAGE_AVAILABLE,
      darkMode: false,
      trainingMode: false, // SECTION 8: Training mode flag
      onboardingComplete: false,
      knowledgeBase: [],
      guidelines: {
        SAHPRA: [
          'Declare reliance pathway (Abridged/Verified) in Module 1',
          'Submit required forms GLF-PEM-02L and GLF-PEM-02E',
          'Provide unredacted assessment reports from EMA/FDA/TGA',
          'Include Zone IVb stability data and API supplier documentation',
          'Ensure labeling matches final RRA-approved version',
          'Provide change log documenting differences from reference'
        ],
        TMDA: [
          'Declare reliance pathway and reference authority in Module 1.2',
          'Include sameness declaration and applicant consent',
          'Provide unredacted RRA assessment reports within 60-90 days',
          'Submit TMDA forms and fees in Module 1.10.3',
          'Include local labeling compliant with TMDA requirements'
        ],
        BoMRA: [
          'State RRA approval or ZAZIBONA recommendation with supporting proof',
          'Submit BoMRA forms, fees, and local labeling',
          'Provide full assessment reports or letter of authorization',
          'Include Zone IVb stability data and bioequivalence reports',
          'Attach valid GMP certificates for all manufacturing sites'
        ]
      }
    };
    
    // CTD Structure Definition
    const ctdStructure = [
      {
        id: 'm1',
        name: 'Module 1: Administrative Information',
        children: [
          { id: 'm1-1', name: '1.1 Cover Letter' },
          { id: 'm1-2', name: '1.2 Administrative & Prescribing Info' },
          { id: 'm1-3', name: '1.3 Product Information' },
          { id: 'm1-4', name: '1.4 Labeling' }
        ]
      },
      {
        id: 'm2',
        name: 'Module 2: CTD Summaries',
        children: [
          { id: 'm2-3', name: '2.3 Quality Overall Summary' },
          { id: 'm2-4', name: '2.4 Nonclinical Overview' },
          { id: 'm2-5', name: '2.5 Clinical Overview' },
          { id: 'm2-7', name: '2.7 Clinical Summary' }
        ]
      },
      { id: 'm3', name: 'Module 3: Quality (CMC)' },
      { id: 'm4', name: 'Module 4: Nonclinical Study Reports' },
      { id: 'm5', name: 'Module 5: Clinical Study Reports' }
    ];
    
    // Default Rules by Authority
    const defaultRules = {
      SAHPRA: [
        {
          id: 'SAHPRA-001',
          pattern: /abridged|verified/i,
          severity: 'critical',
          category: 'Administrative',
          message: 'Reliance pathway declaration missing or unclear',
          impact: 3,
          likelihood: 3,
          citations: ['SAHPRA Reliance Guideline §1.2']
        },
        {
          id: 'SAHPRA-002',
          pattern: /zone ivb|stability/i,
          severity: 'major',
          category: 'Quality',
          message: 'Zone IVb stability data missing',
          impact: 2,
          likelihood: 3,
          citations: ['ICH Q1E for South Africa']
        }
      ],
      TMDA: [
        {
          id: 'TMDA-001',
          pattern: /sameness declaration/i,
          severity: 'critical',
          category: 'Administrative',
          message: 'Sameness declaration (Module 1.2) missing or incomplete',
          impact: 3,
          likelihood: 3,
          citations: ['TMDA Guidelines §1.2']
        }
      ],
      BoMRA: [
        {
          id: 'BOMRA-001',
          pattern: /zazibona|recommendation/i,
          severity: 'critical',
          category: 'Administrative',
          message: 'ZAZIBONA recommendation or RRA approval not declared',
          impact: 3,
          likelihood: 2,
          citations: ['BoMRA Reliance Guideline']
        }
      ]
    };
    
    /* ================================================================
       SECTION 5: CENTRALIZED ERROR HANDLING
       ================================================================ */
    
    function handleError(error, context, recoveryInstructions) {
      console.error(`[${context}]`, error);
      
      // Log to audit trail
      logAction(`ERROR in ${context}: ${error.message}`).catch(e => {
        console.error('Failed to log error to audit', e);
      });
      
      // Display user-friendly error
      const banner = document.getElementById('errorBanner');
      const title = document.getElementById('errorTitle');
      const message = document.getElementById('errorMessage');
      const recovery = document.getElementById('errorRecovery');
      
      title.textContent = `Error: ${context}`;
      message.textContent = error.message || 'An unexpected error occurred';
      recovery.textContent = recoveryInstructions || 'Please try again or contact support if the issue persists.';
      
      banner.classList.add('visible');
      
      // Auto-hide after 10 seconds unless manually dismissed
      setTimeout(() => {
        banner.classList.remove('visible');
      }, 10000);
    }
    
    // Dismiss error banner
    document.getElementById('dismissError').addEventListener('click', () => {
      document.getElementById('errorBanner').classList.remove('visible');
    });
    
    /* ================================================================
       UTILITY FUNCTIONS
       ================================================================ */
    
    function showToast(message, type = 'info') {
      const container = document.getElementById('toastContainer');
      const toast = document.createElement('div');
      toast.className = `toast ${type}`;
      
      let icon = 'fa-info-circle';
      if (type === 'success') icon = 'fa-check-circle';
      if (type === 'error') icon = 'fa-exclamation-circle';
      if (type === 'warning') icon = 'fa-exclamation-triangle';
      
      toast.innerHTML = `<i class="fas ${icon}"></i><span>${message}</span>`;
      container.appendChild(toast);
      
      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
      }, 4000);
    }
    
    function showLoading() {
      document.getElementById('loadingOverlay').classList.add('visible');
    }
    
    function hideLoading() {
      document.getElementById('loadingOverlay').classList.remove('visible');
    }
    
    /* ================================================================
       SECTION 2: SCOPED RENDERING (Performance Optimization)
       Only render the active page, avoid full re-renders
       ================================================================ */
    
    // Cache of rendered pages to avoid unnecessary re-renders
    const pageRenderCache = {
      dashboard: false,
      submit: false,
      mapping: false,
      analysis: false,
      rules: false,
      history: false,
      report: false,
      knowledge: false,
      settings: false,
      help: false
    };
    
    function setActivePage(pageId) {
      // Only update DOM for page visibility
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      
      const page = document.getElementById(pageId);
      if (page) page.classList.add('active');
      
      const navId = pageId.replace('page-', 'nav-');
      const navEl = document.getElementById(navId);
      if (navEl) navEl.classList.add('active');
      
      // SECTION 2: Only render page content if not cached or if data changed
      const pageName = pageId.replace('page-', '');
      
      // Render page-specific content
      switch (pageName) {
        case 'dashboard':
          renderDashboard();
          break;
        case 'submit':
          renderSubmitPage();
          break;
        case 'mapping':
          renderMappingPage();
          break;
        case 'analysis':
          renderAnalysisPage();
          break;
        case 'rules':
          renderRulesPage();
          break;
        case 'history':
          renderHistoryPage();
          break;
      }
      
      updateProgress();
      updateTrainingHints();
    }
    
    function updateProgress() {
      if (APP.currentIndex === null) {
        document.getElementById('overallProgress').style.width = '0%';
        document.getElementById('progressLabel').textContent = 'No dossier selected';
        document.getElementById('progressPercent').textContent = '0%';
        return;
      }
      
      const proj = APP.projects[APP.currentIndex];
      let score = 0;
      
      if (proj.files.length > 0) score += 25;
      if (Object.keys(proj.ctdMapping || {}).length > 0) score += 25;
      if (proj.findings && proj.findings.length > 0) score += 25;
      if (proj.findings && proj.findings.some(f => f.status)) score += 25;
      
      document.getElementById('overallProgress').style.width = `${score}%`;
      document.getElementById('progressPercent').textContent = `${score}%`;
      
      if (score === 0) document.getElementById('progressLabel').textContent = 'Upload files to begin';
      else if (score === 25) document.getElementById('progressLabel').textContent = 'Map files to CTD';
      else if (score === 50) document.getElementById('progressLabel').textContent = 'Run analysis';
      else if (score === 75) document.getElementById('progressLabel').textContent = 'Review findings';
      else document.getElementById('progressLabel').textContent = 'Ready to finalize';
      
      // Mark completed steps
      document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('completed');
      });
      if (proj.files.length > 0) document.getElementById('nav-submit').classList.add('completed');
      if (Object.keys(proj.ctdMapping || {}).length > 0) document.getElementById('nav-mapping').classList.add('completed');
      if (proj.findings && proj.findings.length > 0) document.getElementById('nav-analysis').classList.add('completed');
    }
    
    /* ================================================================
       SECTION 8: TRAINING MODE FUNCTIONS
       ================================================================ */
    
    function updateTrainingHints() {
      const hints = document.querySelectorAll('.training-hint');
      hints.forEach(hint => {
        if (APP.trainingMode) {
          hint.classList.add('visible');
        } else {
          hint.classList.remove('visible');
        }
      });
    }
    
    /* ================================================================
       SECTION 5: WRAPPED ASYNC OPERATIONS
       ================================================================ */
    
    async function logAction(action) {
      try {
        if (APP.currentIndex === null) return;
        const proj = APP.projects[APP.currentIndex];
        const entry = {
          time: new Date().toISOString(),
          action,
          user: APP.role
        };
        
        const prevHash = proj.historyHash || '';
        const data = JSON.stringify(entry);
        const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(prevHash + data));
        const hash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
        
        entry.hash = hash;
        proj.historyHash = hash;
        proj.history = proj.history || [];
        proj.history.push(entry);
        
        saveApp();
      } catch (error) {
        handleError(error, 'Audit Logging', 'Action was completed but not logged to audit trail.');
      }
    }
    
    function saveApp() {
      if (APP.persist && STORAGE_AVAILABLE) {
        try {
          const data = JSON.stringify(APP);
          localStorage.setItem('raia_v15_state', data);
        } catch (e) {
          console.warn('Save failed', e);
          handleError(e, 'Data Persistence', 'Your changes may not be saved. Export your dossier to preserve work.');
        }
      }
    }
    
    function loadApp() {
      if (STORAGE_AVAILABLE) {
        try {
          const data = localStorage.getItem('raia_v15_state');
          if (data) {
            const parsed = JSON.parse(data);
            Object.assign(APP, parsed);
          }
        } catch (e) {
          console.warn('Load failed', e);
          handleError(e, 'Data Loading', 'Could not restore previous session. Starting fresh.');
        }
      }
    }
    
    /* ================================================================
       SECTION 1: DASHBOARD WITH PRIMARY ACTION EMPHASIS
       ================================================================ */
    
    function renderDashboard() {
      const primaryContainer = document.getElementById('primaryActionContainer');
      const projectList = document.getElementById('projectList');
      
      // Clear primary action
      primaryContainer.innerHTML = '';
      
      if (APP.currentIndex !== null) {
        // User has active dossier - show "Continue Review"
        const proj = APP.projects[APP.currentIndex];
        primaryContainer.innerHTML = `
          <div class="primary-action-card">
            <h2>Continue Review</h2>
            <p>Resume work on <strong>${proj.name}</strong> (${proj.authority})</p>
            <button class="button" onclick="continueReview()">
              <i class="fas fa-play-circle"></i> Continue Review
            </button>
          </div>
        `;
      } else if (APP.projects.length > 0) {
        // User has dossiers but none active - show "Open Dossier"
        primaryContainer.innerHTML = `
          <div class="primary-action-card">
            <h2>Open a Dossier</h2>
            <p>Select a dossier below to begin review</p>
            <button class="button" onclick="showSecondaryActions()">
              <i class="fas fa-folder-open"></i> View Dossiers
            </button>
          </div>
        `;
      } else {
        // No dossiers - show "Create First Dossier"
        primaryContainer.innerHTML = `
          <div class="primary-action-card">
            <h2>Get Started</h2>
            <p>Create your first regulatory dossier to begin</p>
            <button class="button" onclick="showSecondaryActions()">
              <i class="fas fa-plus-circle"></i> Create Dossier
            </button>
          </div>
        `;
      }
      
      // Render project list
      projectList.innerHTML = '';
      
      if (!APP.projects.length) {
        projectList.innerHTML = '<p class="text-muted">No dossiers yet. Create one above to get started.</p>';
        return;
      }
      
      APP.projects.forEach((proj, idx) => {
        const card = document.createElement('div');
        card.className = 'card interactive';
        card.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div style="flex: 1;">
              <div style="font-weight: 600; font-size: 1.1rem; margin-bottom: 0.5rem;">${proj.name}</div>
              <div class="text-muted text-sm">
                <i class="fas fa-building"></i> ${proj.authority} | 
                <i class="fas fa-route"></i> ${proj.pathway} | 
                <i class="fas fa-file"></i> ${proj.files.length} files
              </div>
            </div>
            <button class="button secondary" onclick="deleteProject(${idx}); event.stopPropagation();">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        `;
        card.addEventListener('click', () => openProject(idx));
        projectList.appendChild(card);
      });
    }
    
    // Global functions for dashboard actions
    window.continueReview = function() {
      setActivePage('page-submit');
    };
    
    window.showSecondaryActions = function() {
      const secondary = document.getElementById('secondaryActions');
      const btn = document.getElementById('toggleSecondaryBtn');
      secondary.classList.add('visible');
      btn.style.display = 'none';
    };
    
    function openProject(idx) {
      APP.currentIndex = idx;
      showToast(`Opened dossier: ${APP.projects[idx].name}`, 'success');
      logAction(`Opened dossier: ${APP.projects[idx].name}`);
      setActivePage('page-submit');
      updateProgress();
    }
    
    window.deleteProject = function(idx) {
      if (!confirm('Delete this dossier? This cannot be undone.')) return;
      const name = APP.projects[idx].name;
      APP.projects.splice(idx, 1);
      if (APP.currentIndex === idx) APP.currentIndex = null;
      saveApp();
      renderDashboard();
      updateProgress();
      showToast('Dossier deleted', 'info');
      logAction(`Deleted dossier: ${name}`);
    };
    
    /* ================================================================
       CREATE DOSSIER
       ================================================================ */
    
    async function createDossier() {
      try {
        const name = document.getElementById('newName').value.trim();
        const authority = document.getElementById('newAuthority').value;
        const pathway = document.getElementById('newPathway').value;
        
        if (!name || !authority || !pathway) {
          showToast('Please complete all required fields', 'error');
          return;
        }
        
        const project = {
          name,
          authority,
          pathway,
          files: [],
          chunks: [],
          ctdMapping: {},
          findings: [],
          history: [],
          historyHash: '',
          rules: null,
          createdAt: new Date().toISOString()
        };
        
        APP.projects.push(project);
        APP.currentIndex = APP.projects.length - 1;
        
        await logAction(`Created dossier: ${name}`);
        saveApp();
        showToast(`Dossier "${name}" created successfully`, 'success');
        renderDashboard();
        setActivePage('page-submit');
        updateProgress();
      } catch (error) {
        handleError(error, 'Create Dossier', 'Please try creating the dossier again.');
      }
    }
    
    /* ================================================================
       SECTION 4: FILE UPLOAD WITH PROGRESS FEEDBACK
       ================================================================ */
    
    async function handleFiles(fileList) {
      if (APP.currentIndex === null) {
        showToast('Please create or open a dossier first', 'error');
        return;
      }
      
      try {
        const progress = document.getElementById('uploadProgress');
        const statusText = document.getElementById('uploadStatusText');
        const percentage = document.getElementById('uploadPercentage');
        const progressFill = document.getElementById('uploadProgressFill');
        const fileListEl = document.getElementById('uploadFileList');
        
        progress.classList.add('visible');
        fileListEl.innerHTML = '';
        
        const total = fileList.length;
        let completed = 0;
        
        const proj = APP.projects[APP.currentIndex];
        
        for (const file of fileList) {
          // Add file to list
          const fileItem = document.createElement('div');
          fileItem.className = 'upload-file-item uploading';
          fileItem.innerHTML = `<i class="fas fa-spinner fa-spin"></i> <span>${file.name}</span>`;
          fileListEl.appendChild(fileItem);
          
          try {
            if (file.name.toLowerCase().endsWith('.zip')) {
              await handleZip(file);
            } else {
              await ingestFile(file);
            }
            
            fileItem.className = 'upload-file-item';
            fileItem.innerHTML = `<i class="fas fa-check-circle"></i> <span>${file.name}</span>`;
          } catch (error) {
            fileItem.className = 'upload-file-item error';
            fileItem.innerHTML = `<i class="fas fa-exclamation-circle"></i> <span>${file.name} (failed)</span>`;
            console.error('File upload error:', error);
          }
          
          completed++;
          const percent = Math.round((completed / total) * 100);
          progressFill.style.width = `${percent}%`;
          percentage.textContent = `${percent}%`;
          statusText.textContent = `Uploading ${completed} of ${total} files...`;
        }
        
        statusText.textContent = `Upload complete: ${completed} of ${total} files`;
        
        setTimeout(() => {
          progress.classList.remove('visible');
        }, 2000);
        
        renderSubmitPage();
        updateProgress();
        showToast(`${completed} file(s) uploaded successfully`, 'success');
        await logAction(`Uploaded ${completed} files`);
      } catch (error) {
        handleError(error, 'File Upload', 'Some files may not have been uploaded. Please try again.');
        document.getElementById('uploadProgress').classList.remove('visible');
      }
    }
    
    async function handleZip(zipFile) {
      const zip = await JSZip.loadAsync(zipFile);
      for (const entry of Object.keys(zip.files)) {
        const zipEntry = zip.files[entry];
        if (zipEntry.dir) continue;
        
        const blob = await zipEntry.async('blob');
        const fileName = entry.split('/').pop();
        const file = new File([blob], fileName);
        await ingestFile(file);
      }
    }
    
    async function ingestFile(file) {
      const proj = APP.projects[APP.currentIndex];
      
      if (proj.files.find(f => f.name === file.name)) return;
      
      const text = await extractText(file);
      const hash = await computeFileHash(file);
      
      const paragraphs = text.split(/\n+/).filter(p => p.trim());
      paragraphs.forEach((para, idx) => {
        proj.chunks.push({
          fileName: file.name,
          text: para.trim(),
          index: idx
        });
      });
      
      proj.files.push({
        name: file.name,
        size: file.size,
        content: text,
        hash,
        uploadedAt: new Date().toISOString()
      });
    }
    
    async function extractText(file) {
      const name = file.name.toLowerCase();
      
      if (name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.csv')) {
        return await file.text();
      }
      
      if (name.endsWith('.pdf')) {
        return await parsePdf(file);
      }
      
      if (name.endsWith('.docx') || name.endsWith('.doc')) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer });
          return result.value;
        } catch (e) {
          console.warn('DOCX parse failed', e);
          return '';
        }
      }
      
      return '';
    }
    
    async function parsePdf(file) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const typedarray = new Uint8Array(reader.result);
            const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
            let text = '';
            
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const content = await page.getTextContent();
              const strings = content.items.map(item => item.str);
              text += strings.join(' ') + '\n';
            }
            
            resolve(text);
          } catch (e) {
            console.warn('PDF parse failed', e);
            resolve('');
          }
        };
        reader.readAsArrayBuffer(file);
      });
    }
    
    async function computeFileHash(file) {
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }
    
    /* ================================================================
       RENDER SUBMIT PAGE
       ================================================================ */
    
    function renderSubmitPage() {
      const proj = APP.projects[APP.currentIndex];
      if (!proj) return;
      
      document.getElementById('fileCount').textContent = `${proj.files.length} files`;
      
      const fileList = document.getElementById('fileList');
      fileList.innerHTML = '';
      
      if (!proj.files.length) {
        fileList.innerHTML = '<p class="text-muted">No files uploaded yet.</p>';
      } else {
        proj.files.forEach((file) => {
          const div = document.createElement('div');
          div.style.padding = '0.75rem';
          div.style.borderBottom = '1px solid #e2e8f0';
          div.style.display = 'flex';
          div.style.alignItems = 'center';
          div.style.gap = '0.75rem';
          div.innerHTML = `
            <i class="fas fa-file-alt" style="color: #667eea;"></i>
            <div style="flex: 1;">
              <div style="font-weight: 500;">${file.name}</div>
              <div class="text-muted text-sm">${Math.round(file.size / 1024)} KB | Hash: ${file.hash.substring(0, 16)}...</div>
            </div>
          `;
          fileList.appendChild(div);
        });
      }
      
      // Render guidelines
      const guidelines = document.getElementById('guidelinesContainer');
      guidelines.innerHTML = '';
      
      if (APP.guidelines[proj.authority]) {
        const ul = document.createElement('ul');
        ul.style.marginLeft = '1.5rem';
        ul.style.lineHeight = '1.8';
        
        APP.guidelines[proj.authority].forEach(text => {
          const li = document.createElement('li');
          li.textContent = text;
          ul.appendChild(li);
        });
        
        guidelines.appendChild(ul);
      }
    }
    
    /* ================================================================
       CTD MAPPING PAGE
       ================================================================ */
    
    function renderMappingPage() {
      const proj = APP.projects[APP.currentIndex];
      if (!proj) return;
      
      proj.ctdMapping = proj.ctdMapping || {};
      
      const totalFiles = proj.files.length;
      const mappedFiles = Object.keys(proj.ctdMapping).length;
      const unmappedFiles = totalFiles - mappedFiles;
      const percent = totalFiles > 0 ? Math.round((mappedFiles / totalFiles) * 100) : 0;
      
      document.getElementById('mappedCount').textContent = `${mappedFiles} / ${totalFiles}`;
      document.getElementById('unmappedCount').textContent = unmappedFiles;
      document.getElementById('mappingPercent').textContent = `${percent}%`;
      
      renderFilePool();
      renderCTDTree();
    }
    
    function renderFilePool() {
      const proj = APP.projects[APP.currentIndex];
      const container = document.getElementById('filePoolList');
      container.innerHTML = '';
      
      const unmappedFiles = proj.files.filter(f => !proj.ctdMapping[f.name]);
      document.getElementById('poolCount').textContent = unmappedFiles.length;
      
      unmappedFiles.forEach(file => {
        const div = document.createElement('div');
        div.className = 'file-item';
        div.draggable = true;
        div.dataset.fileName = file.name;
        div.innerHTML = `
          <i class="fas fa-file-alt"></i>
          <div class="file-name">${file.name}</div>
          <div class="file-size">${Math.round(file.size / 1024)} KB</div>
        `;
        
        div.addEventListener('dragstart', e => {
          e.dataTransfer.setData('fileName', file.name);
          div.classList.add('dragging');
        });
        
        div.addEventListener('dragend', () => {
          div.classList.remove('dragging');
        });
        
        container.appendChild(div);
      });
    }
    
    function renderCTDTree() {
      const container = document.getElementById('ctdTreeContainer');
      container.innerHTML = '';
      
      ctdStructure.forEach(node => {
        container.appendChild(createCTDNode(node));
      });
    }
    
    function createCTDNode(node) {
      const proj = APP.projects[APP.currentIndex];
      const div = document.createElement('div');
      div.className = 'ctd-node';
      
      const mappedToThis = Object.entries(proj.ctdMapping)
        .filter(([_, ctdId]) => ctdId === node.id);
      
      const header = document.createElement('div');
      header.className = 'ctd-node-header';
      header.dataset.nodeId = node.id;
      
      let expandIcon = '';
      if (node.children && node.children.length) {
        expandIcon = '<i class="fas fa-chevron-right expand-icon"></i>';
      }
      
      header.innerHTML = `
        ${expandIcon}
        <div class="node-name">${node.name}</div>
        ${mappedToThis.length > 0 ? `<div class="file-count">${mappedToThis.length}</div>` : ''}
      `;
      
      // Drag and drop
      header.addEventListener('dragover', e => {
        e.preventDefault();
        header.classList.add('drop-target');
      });
      
      header.addEventListener('dragleave', () => {
        header.classList.remove('drop-target');
      });
      
      header.addEventListener('drop', async e => {
        e.preventDefault();
        header.classList.remove('drop-target');
        
        const fileName = e.dataTransfer.getData('fileName');
        if (fileName) {
          proj.ctdMapping[fileName] = node.id;
          saveApp();
          await logAction(`Mapped ${fileName} to ${node.name}`);
          renderMappingPage();
          showToast(`Mapped ${fileName} to ${node.name}`, 'success');
        }
      });
      
      // Expand/collapse
      if (node.children && node.children.length) {
        const childrenDiv = document.createElement('div');
        childrenDiv.className = 'ctd-node-children';
        
        header.addEventListener('click', () => {
          header.classList.toggle('expanded');
          childrenDiv.classList.toggle('expanded');
        });
        
        node.children.forEach(child => {
          childrenDiv.appendChild(createCTDNode(child));
        });
        
        div.appendChild(header);
        div.appendChild(childrenDiv);
      } else {
        div.appendChild(header);
      }
      
      // Mapped files
      if (mappedToThis.length > 0) {
        const filesDiv = document.createElement('div');
        filesDiv.className = 'ctd-node-files';
        
        mappedToThis.forEach(([fileName]) => {
          const fileDiv = document.createElement('div');
          fileDiv.className = 'mapped-file';
          fileDiv.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span>${fileName}</span>
            <i class="fas fa-times remove"></i>
          `;
          
          fileDiv.querySelector('.remove').addEventListener('click', async () => {
            delete proj.ctdMapping[fileName];
            saveApp();
            await logAction(`Unmapped ${fileName} from ${node.name}`);
            renderMappingPage();
            showToast(`Unmapped ${fileName}`, 'info');
          });
          
          filesDiv.appendChild(fileDiv);
        });
        
        div.appendChild(filesDiv);
      }
      
      return div;
    }
    
    async function suggestMappings() {
      try {
        const proj = APP.projects[APP.currentIndex];
        let suggested = 0;
        
        proj.files.forEach(file => {
          if (proj.ctdMapping[file.name]) return;
          
          const name = file.name.toLowerCase();
          
          if (name.includes('cover') || name.includes('letter')) {
            proj.ctdMapping[file.name] = 'm1-1';
            suggested++;
          } else if (name.includes('admin') || name.includes('form')) {
            proj.ctdMapping[file.name] = 'm1-2';
            suggested++;
          } else if (name.includes('label')) {
            proj.ctdMapping[file.name] = 'm1-4';
            suggested++;
          } else if (name.includes('quality') || name.includes('cmc')) {
            proj.ctdMapping[file.name] = 'm3';
            suggested++;
          } else if (name.includes('nonclinical') || name.includes('toxicology')) {
            proj.ctdMapping[file.name] = 'm4';
            suggested++;
          } else if (name.includes('clinical') || name.includes('study')) {
            proj.ctdMapping[file.name] = 'm5';
            suggested++;
          }
        });
        
        saveApp();
        await logAction(`Auto-suggested ${suggested} mappings`);
        renderMappingPage();
        showToast(`Suggested ${suggested} mappings based on filenames`, 'success');
      } catch (error) {
        handleError(error, 'Suggest Mappings', 'Please try manual mapping or rename files for better suggestions.');
      }
    }
    
    async function clearMappings() {
      if (!confirm('Clear all CTD mappings?')) return;
      
      try {
        const proj = APP.projects[APP.currentIndex];
        proj.ctdMapping = {};
        saveApp();
        await logAction('Cleared all CTD mappings');
        renderMappingPage();
        showToast('All mappings cleared', 'info');
      } catch (error) {
        handleError(error, 'Clear Mappings', 'Please try again.');
      }
    }
    
    /* ================================================================
       ANALYSIS PAGE
       ================================================================ */
    
    async function runAnalysis() {
      try {
        const proj = APP.projects[APP.currentIndex];
        
        const mappedCount = Object.keys(proj.ctdMapping).length;
        const totalFiles = proj.files.length;
        
        if (mappedCount < totalFiles) {
          const proceed = confirm(`${totalFiles - mappedCount} files are unmapped. Continue analysis anyway?`);
          if (!proceed) return;
        }
        
        showLoading();
        
        proj.findings = [];
        const rules = proj.rules || defaultRules[proj.authority] || [];
        
        rules.forEach(rule => {
          proj.chunks.forEach(chunk => {
            if (rule.pattern.test(chunk.text)) {
              const riskScore = (rule.impact || 1) * (rule.likelihood || 1);
              
              proj.findings.push({
                id: rule.id,
                severity: rule.severity,
                category: rule.category,
                message: rule.message,
                evidence: chunk.text.substring(0, 200),
                fileName: chunk.fileName,
                risk: riskScore,
                citations: rule.citations || [],
                status: null
              });
            }
          });
        });
        
        await logAction(`Ran compliance check: ${proj.findings.length} findings`);
        hideLoading();
        renderAnalysisPage();
        showToast(`Analysis complete: ${proj.findings.length} findings`, 'success');
      } catch (error) {
        hideLoading();
        handleError(error, 'Compliance Analysis', 'Analysis may be incomplete. Please review manually.');
      }
    }
    
    function renderAnalysisPage() {
      const proj = APP.projects[APP.currentIndex];
      if (!proj) return;
      
      const summary = document.getElementById('analysisSummary');
      summary.innerHTML = '';
      
      const critical = proj.findings.filter(f => f.severity === 'critical').length;
      const major = proj.findings.filter(f => f.severity === 'major').length;
      const minor = proj.findings.filter(f => f.severity === 'minor').length;
      const maxRisk = Math.max(...proj.findings.map(f => f.risk || 0), 0);
      
      summary.innerHTML = `
        <div class="status-card danger informational">
          <div class="label">Critical Findings</div>
          <div class="value"><i class="fas fa-exclamation-triangle"></i>${critical}</div>
        </div>
        <div class="status-card warning informational">
          <div class="label">Major Findings</div>
          <div class="value"><i class="fas fa-exclamation-circle"></i>${major}</div>
        </div>
        <div class="status-card success informational">
          <div class="label">Minor Findings</div>
          <div class="value"><i class="fas fa-info-circle"></i>${minor}</div>
        </div>
        <div class="status-card informational">
          <div class="label">Max Risk Score</div>
          <div class="value">${maxRisk}</div>
        </div>
      `;
      
      renderFindings();
    }
    
    function renderFindings() {
      const proj = APP.projects[APP.currentIndex];
      const container = document.getElementById('findingsDashboard');
      container.innerHTML = '';
      
      if (!proj.findings.length) {
        container.innerHTML = '<div class="card"><p class="text-muted">No findings yet. Run compliance check to analyze your dossier.</p></div>';
        return;
      }
      
      const critical = proj.findings.filter(f => f.severity === 'critical');
      const major = proj.findings.filter(f => f.severity === 'major');
      const minor = proj.findings.filter(f => f.severity === 'minor');
      
      if (critical.length) container.appendChild(createSeveritySection('critical', 'Critical Findings', critical));
      if (major.length) container.appendChild(createSeveritySection('major', 'Major Findings', major));
      if (minor.length) container.appendChild(createSeveritySection('minor', 'Minor Findings', minor));
    }
    
    function createSeveritySection(severity, title, findings) {
      const section = document.createElement('div');
      section.className = 'severity-section';
      
      const header = document.createElement('div');
      header.className = `severity-header ${severity}`;
      header.innerHTML = `
        <i class="fas fa-exclamation-triangle icon"></i>
        <div class="title">${title}</div>
        <div class="count">${findings.length}</div>
        <i class="fas fa-chevron-down" style="color: #718096;"></i>
      `;
      
      const list = document.createElement('div');
      list.className = 'findings-list expanded';
      
      findings.forEach(finding => {
        list.appendChild(createFindingCard(finding));
      });
      
      header.addEventListener('click', () => {
        list.classList.toggle('expanded');
        const icon = header.querySelector('.fa-chevron-down');
        icon.style.transform = list.classList.contains('expanded') ? 'rotate(0deg)' : 'rotate(-90deg)';
      });
      
      section.appendChild(header);
      section.appendChild(list);
      
      return section;
    }
    
    function createFindingCard(finding) {
      const card = document.createElement('div');
      card.className = 'finding-card';
      
      const findingId = `finding-${finding.id}-${Math.random().toString(36).substr(2, 9)}`;
      
      card.innerHTML = `
        <div class="finding-header">
          <div class="finding-id">${finding.id}</div>
          <div class="finding-message">${finding.message}</div>
          <div class="finding-category">${finding.category}</div>
        </div>
        <div class="finding-body">
          <div class="finding-meta">
            <span><i class="fas fa-file"></i> ${finding.fileName}</span>
            <span><i class="fas fa-chart-line"></i> Risk: ${finding.risk}</span>
            ${finding.citations.length ? `<span><i class="fas fa-book"></i> ${finding.citations[0]}</span>` : ''}
          </div>
          <div class="finding-evidence">${finding.evidence}...</div>
          <div class="explainability-panel" id="explain-${findingId}">
            <h4><i class="fas fa-lightbulb"></i> Why was this flagged?</h4>
            <div class="detail"><strong>Pattern matched:</strong> Regulatory requirement check</div>
            <div class="detail"><strong>Evidence location:</strong> ${finding.fileName}</div>
            <div class="detail"><strong>Risk calculation:</strong> Impact × Likelihood = ${finding.risk}</div>
            ${finding.citations.length ? `<div class="detail"><strong>Citations:</strong> ${finding.citations.join(', ')}</div>` : ''}
          </div>
          <div class="finding-actions">
            <button class="button secondary" data-action="explain" data-id="${findingId}">
              <i class="fas fa-question-circle"></i> Explain
            </button>
            <button class="button success" data-action="accept" data-finding="${finding.id}">
              <i class="fas fa-check"></i> Accept
            </button>
            <button class="button danger" data-action="dispute" data-finding="${finding.id}">
              <i class="fas fa-times"></i> Dispute
            </button>
          </div>
        </div>
      `;
      
      return card;
    }
    
    /* ================================================================
       SECTION 3: EVENT DELEGATION (No Memory Leaks)
       ================================================================ */
    
    // Central event handler for all finding actions
    document.addEventListener('click', async (e) => {
      const target = e.target.closest('[data-action]');
      if (!target) return;
      
      const action = target.dataset.action;
      
      if (action === 'explain') {
        const id = target.dataset.id;
        const panel = document.getElementById(`explain-${id}`);
        if (panel) panel.classList.toggle('visible');
      }
      
      if (action === 'accept' || action === 'dispute') {
        const findingId = target.dataset.finding;
        const proj = APP.projects[APP.currentIndex];
        const finding = proj.findings.find(f => f.id === findingId);
        if (finding) {
          finding.status = action === 'accept' ? 'accepted' : 'disputed';
          saveApp();
          await logAction(`Finding ${findingId} marked as ${finding.status}`);
          showToast(`Finding ${findingId} marked as ${finding.status}`, 'success');
        }
      }
    });
    
    /* ================================================================
       RULES PAGE
       ================================================================ */
    
    function renderRulesPage() {
      const proj = APP.projects[APP.currentIndex];
      const container = document.getElementById('rulesContainer');
      container.innerHTML = '';
      
      const rules = proj.rules || defaultRules[proj.authority] || [];
      
      const table = document.createElement('table');
      table.style.width = '100%';
      table.innerHTML = `
        <thead>
          <tr>
            <th>Rule ID</th>
            <th>Severity</th>
            <th>Category</th>
            <th>Message</th>
            <th>Risk</th>
            <th>Citations</th>
          </tr>
        </thead>
      `;
      
      const tbody = document.createElement('tbody');
      rules.forEach(rule => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${rule.id}</strong></td>
          <td><span style="background: ${rule.severity === 'critical' ? '#e53e3e' : rule.severity === 'major' ? '#ed8936' : '#48bb78'}; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.8rem;">${rule.severity}</span></td>
          <td>${rule.category}</td>
          <td>${rule.message}</td>
          <td>${(rule.impact || 1) * (rule.likelihood || 1)}</td>
          <td class="text-sm">${(rule.citations || []).join('; ')}</td>
        `;
        tbody.appendChild(tr);
      });
      
      table.appendChild(tbody);
      container.appendChild(table);
    }
    
    async function resetRules() {
      if (!confirm('Reset rules to defaults?')) return;
      try {
        const proj = APP.projects[APP.currentIndex];
        proj.rules = null;
        saveApp();
        await logAction('Reset rules to defaults');
        renderRulesPage();
        showToast('Rules reset to defaults', 'success');
      } catch (error) {
        handleError(error, 'Reset Rules', 'Please try again.');
      }
    }
    
    /* ================================================================
       AUDIT HISTORY PAGE
       ================================================================ */
    
    function renderHistoryPage() {
      const proj = APP.projects[APP.currentIndex];
      const container = document.getElementById('historyContainer');
      container.innerHTML = '';
      
      if (!proj.history || !proj.history.length) {
        container.innerHTML = '<p class="text-muted">No audit trail entries yet.</p>';
        return;
      }
      
      const timeline = document.createElement('div');
      proj.history.forEach(entry => {
        const item = document.createElement('div');
        item.style.padding = '1rem';
        item.style.borderLeft = '3px solid #667eea';
        item.style.marginBottom = '1rem';
        item.style.background = '#f7fafc';
        item.style.borderRadius = '4px';
        
        const date = new Date(entry.time);
        item.innerHTML = `
          <div style="font-weight: 600; margin-bottom: 0.25rem;">${entry.action}</div>
          <div class="text-muted text-sm">
            <i class="fas fa-clock"></i> ${date.toLocaleString()} | 
            <i class="fas fa-user"></i> ${entry.user} | 
            <i class="fas fa-fingerprint"></i> Hash: ${(entry.hash || '').substring(0, 16)}...
          </div>
        `;
        timeline.appendChild(item);
      });
      
      container.appendChild(timeline);
    }
    
    /* ================================================================
       EXPORT DOSSIER
       ================================================================ */
    
    function exportCurrentProject() {
      try {
        if (APP.currentIndex === null) {
          showToast('Please open a dossier to export.', 'error');
          return;
        }
        
        const proj = APP.projects[APP.currentIndex];
        const dataStr = JSON.stringify(proj, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safeName = proj.name.replace(/[^a-z0-9\-_]/gi, '_');
        a.download = `${safeName}_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Dossier exported successfully', 'success');
        logAction('Exported dossier');
      } catch (error) {
        handleError(error, 'Export Dossier', 'Please try exporting again or contact support.');
      }
    }
    
    /* ================================================================
       INITIALIZATION
       ================================================================ */
    
    function init() {
      loadApp();
      
      // SECTION 3: Event delegation for navigation (no memory leaks)
      document.querySelector('.sidebar').addEventListener('click', (e) => {
        const navItem = e.target.closest('.nav-item');
        if (!navItem) return;
        
        const pageId = navItem.id.replace('nav-', 'page-');
        
        if (APP.currentIndex === null && !['page-dashboard', 'page-settings', 'page-help'].includes(pageId)) {
          showToast('Please create or open a dossier first', 'warning');
          return;
        }
        
        setActivePage(pageId);
      });
      
      // File upload handlers
      const dropzone = document.getElementById('dropzone');
      const fileInput = document.getElementById('fileInput');
      
      dropzone.addEventListener('click', () => fileInput.click());
      dropzone.addEventListener('dragover', e => {
        e.preventDefault();
        dropzone.style.borderColor = '#667eea';
        dropzone.style.background = '#ebf4ff';
      });
      dropzone.addEventListener('dragleave', () => {
        dropzone.style.borderColor = '';
        dropzone.style.background = '';
      });
      dropzone.addEventListener('drop', e => {
        e.preventDefault();
        dropzone.style.borderColor = '';
        dropzone.style.background = '';
        handleFiles(e.dataTransfer.files);
      });
      fileInput.addEventListener('change', e => handleFiles(e.target.files));
      
      // Dashboard toggle
      document.getElementById('toggleSecondaryBtn').addEventListener('click', () => {
        const secondary = document.getElementById('secondaryActions');
        const btn = document.getElementById('toggleSecondaryBtn');
        if (secondary.classList.contains('visible')) {
          secondary.classList.remove('visible');
          btn.innerHTML = '<i class="fas fa-chevron-down"></i> Show All Dossiers';
        } else {
          secondary.classList.add('visible');
          btn.innerHTML = '<i class="fas fa-chevron-up"></i> Hide Dossiers';
        }
      });
      
      // Create dossier
      document.getElementById('createDossierBtn').addEventListener('click', createDossier);
      
      // Analysis
      document.getElementById('runAnalysisBtn').addEventListener('click', runAnalysis);
      document.getElementById('exportBtn').addEventListener('click', exportCurrentProject);
      
      // CTD Mapping
      document.getElementById('suggestMappingsBtn').addEventListener('click', suggestMappings);
      document.getElementById('clearMappingsBtn').addEventListener('click', clearMappings);
      
      // Rules
      document.getElementById('resetRulesBtn').addEventListener('click', resetRules);
      
      // Settings
      document.getElementById('darkModeToggle').addEventListener('change', e => {
        document.body.classList.toggle('dark-mode', e.target.checked);
        APP.darkMode = e.target.checked;
        saveApp();
      });
      
      document.getElementById('persistToggle').addEventListener('change', e => {
        APP.persist = e.target.checked && STORAGE_AVAILABLE;
        if (APP.persist) saveApp();
        showToast(APP.persist ? 'Auto-save enabled' : 'Auto-save disabled', 'info');
      });
      
      // SECTION 8: Training mode toggle
      document.getElementById('trainingModeToggle').addEventListener('change', e => {
        APP.trainingMode = e.target.checked;
        saveApp();
        updateTrainingHints();
        showToast(APP.trainingMode ? 'Training mode enabled' : 'Training mode disabled', 'info');
      });
      
      // Learn More Link
      document.getElementById('learnMoreLink').addEventListener('click', e => {
        e.preventDefault();
        setActivePage('page-help');
      });
      
      // Modal close
      document.getElementById('modalClose').addEventListener('click', () => {
        document.getElementById('modal').classList.remove('visible');
      });
      
      // Apply saved settings
      if (APP.darkMode) {
        document.body.classList.add('dark-mode');
        document.getElementById('darkModeToggle').checked = true;
      }
      if (APP.persist) {
        document.getElementById('persistToggle').checked = true;
      }
      if (APP.trainingMode) {
        document.getElementById('trainingModeToggle').checked = true;
        updateTrainingHints();
      }
      
      // Initial render
      renderDashboard();
      setActivePage('page-dashboard');
      updateProgress();
    }
    
    // Start application
    window.addEventListener('DOMContentLoaded', init);