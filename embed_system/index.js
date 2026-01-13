(function() {
    'use strict';
    
    // Default Configuration
    const DEFAULT_CONFIG = {
        apiUrl: 'https://healthkita-embedded-system.vercel.app/api',
        widgetBaseUrl: 'https://healthkita-embedded-system.vercel.app',
        theme: {
            primaryColor: '#57CC99',
            textColor: '#212121',
            backgroundColor: '#FBFBFB',
            cardBackground: '#ffffff',
            borderColor: '#e0e0e0',
            successColor: '#00b894',
            warningColor: '#ff9800',
            dangerColor: '#ff6b6b'
        }
    };
    
    // Widget Embed Class
    class PatientWidget {
        constructor(options) {
            this.options = {
                containerId: 'patient-widget',
                width: '100%',
                height: 'auto',
                minHeight: '1200px',
                apiKey: '',
                view: 'dashboard',
                patientId: null,
                medicineId: null,
                scheduleId: null,
                mode: null,
                theme: {},
                ...options
            };
            
            this.theme = { ...DEFAULT_CONFIG.theme, ...this.options.theme };
            this.container = null;
            this.iframe = null;
            this.currentView = this.options.view;
            
            this.init();
        }
        
        init() {
            this.container = document.getElementById(this.options.containerId);
            
            if (!this.container) {
                console.error('Patient Widget: Container with ID "' + this.options.containerId + '" not found');
                return;
            }
            
            this.createIframe();
            this.setupMessageListener();
        }
        
        createIframe() {
            const url = this.buildWidgetUrl();
            
            this.iframe = document.createElement('iframe');
            this.iframe.id = 'patient-widget-iframe';
            this.iframe.src = url;
            this.iframe.style.width = this.options.width;
            this.iframe.style.height = this.options.height === 'auto' ? this.options.minHeight : this.options.height;
            this.iframe.style.border = 'none';
            this.iframe.style.overflow = 'hidden';
            this.iframe.style.display = 'block';
            this.iframe.frameBorder = '0';
            this.iframe.scrolling = 'no';
            
            this.container.innerHTML = '<div style="text-align:center; padding:40px; color:#999;">Loading widget...</div>';
            this.container.innerHTML = '';
            this.container.appendChild(this.iframe);
        }
        
        buildWidgetUrl() {
            const params = new URLSearchParams();
            
            // Add theme colors
            Object.keys(this.theme).forEach(key => {
                params.append(key, this.theme[key]);
            });
            
            // Add API key
            if (this.options.apiKey) {
                params.append('apiKey', this.options.apiKey);
            }
            
            // Add patient ID if exists
            if (this.options.patientId) {
                params.append('patientId', this.options.patientId);
            }
            
            // Add medicine ID if exists
            if (this.options.medicineId) {
                params.append('medicineId', this.options.medicineId);
            }
            
            // Add schedule ID if exists
            if (this.options.scheduleId) {
                params.append('scheduleId', this.options.scheduleId);
            }
            
            // Add mode if exists
            if (this.options.mode) {
                params.append('mode', this.options.mode);
            }
            
            // Determine view file
            let viewFile = 'dashboard.html';
            if (this.currentView === 'detail') {
                viewFile = 'patient-detail.html';
            } else if (this.currentView === 'add-medicine') {
                viewFile = 'add-medicine.html';
            } else if (this.currentView === 'add-prescription') {
                viewFile = 'add-prescription.html';
            } else if (this.currentView === 'schedule') {
                viewFile = 'schedule.html';
            } else if (this.currentView === 'medicine') {
                viewFile = 'medicine.html';
            } else if (this.currentView === 'report') {
                viewFile = 'report.html';
            }
            
            return `${DEFAULT_CONFIG.widgetBaseUrl}/${viewFile}?${params.toString()}`;
        }
        
        setupMessageListener() {
            window.addEventListener('message', (event) => {
                const data = event.data;
                
                // Handle different message types
                switch(data.type) {
                    case 'resize':
                        this.handleResize(data);
                        break;
                    case 'navigate':
                        this.handleNavigation(data);
                        break;
                    case 'patient-selected':
                        this.handlePatientSelected(data);
                        break;
                    case 'save-medicine':
                        this.handleSaveMedicine(data);
                        break;
                    case 'save-prescription':
                        this.handleSavePrescription(data);
                        break;
                    case 'schedule-deleted':
                        this.handleScheduleDeleted(data);
                        break;
                    case 'schedule-stopped':
                        this.handleScheduleStopped(data);
                        break;
                    case 'medicine-deleted':
                        this.handleMedicineDeleted(data);
                        break;
                    case 'report-generated':
                        this.handleReportGenerated(data);
                        break;
                }
            }, false);
        }
        
        handleResize(data) {
            if (this.options.height === 'auto' && data.height) {
                this.iframe.style.height = data.height + 'px';
            }
        }
        
        handleNavigation(data) {
            this.currentView = data.view;
            this.options.patientId = data.patientId || null;
            this.options.medicineId = data.medicineId || null;
            this.options.scheduleId = data.scheduleId || null;
            this.options.mode = data.mode || null;
            
            this.createIframe();
            this.triggerEvent('navigate', data);
        }
        
        handlePatientSelected(data) {
            this.options.patientId = data.patientId;
            this.triggerEvent('patient-selected', data);
        }
        
        handleSaveMedicine(data) {
            this.triggerEvent('medicine-saved', data);
            this.navigateTo('medicine');
        }
        
        handleSavePrescription(data) {
            this.triggerEvent('prescription-saved', data);
            
            if (this.options.patientId) {
                this.navigateTo('detail', this.options.patientId);
            } else {
                this.navigateTo('schedule');
            }
        }
        
        handleScheduleDeleted(data) {
            this.triggerEvent('schedule-deleted', data);
        }
        
        handleScheduleStopped(data) {
            this.triggerEvent('schedule-stopped', data);
        }
        
        handleMedicineDeleted(data) {
            this.triggerEvent('medicine-deleted', data);
        }
        
        handleReportGenerated(data) {
            this.triggerEvent('report-generated', data);
        }
        
        triggerEvent(eventName, data) {
            const event = new CustomEvent('patient-widget:' + eventName, {
                detail: data
            });
            this.container.dispatchEvent(event);
        }
        
        // Public methods
        navigateTo(view, patientId = null, options = {}) {
            this.currentView = view;
            if (patientId) {
                this.options.patientId = patientId;
            }
            if (options.medicineId) {
                this.options.medicineId = options.medicineId;
            }
            if (options.scheduleId) {
                this.options.scheduleId = options.scheduleId;
            }
            if (options.mode) {
                this.options.mode = options.mode;
            }
            this.createIframe();
        }
        
        setTheme(theme) {
            this.theme = { ...this.theme, ...theme };
            this.createIframe();
        }
        
        destroy() {
            if (this.iframe && this.iframe.parentNode) {
                this.iframe.parentNode.removeChild(this.iframe);
            }
        }
        
        reload() {
            if (this.iframe) {
                this.iframe.src = this.iframe.src;
            }
        }
    }
    
    // Expose to global scope
    window.PatientWidget = PatientWidget;
    
    // Auto-initialize from script tag
    (function() {
        const scripts = document.getElementsByTagName('script');
        const currentScript = scripts[scripts.length - 1];
        
        const apiKey = currentScript.getAttribute('data-api-key') || '';
        const containerId = currentScript.getAttribute('data-container-id') || 'patient-widget';
        
        // Get theme from data attributes
        const theme = {};
        const themeAttrs = ['primary-color', 'text-color', 'background-color', 'card-background', 'border-color', 'success-color', 'warning-color', 'danger-color'];
        
        themeAttrs.forEach(attr => {
            const value = currentScript.getAttribute('data-' + attr);
            if (value) {
                const camelCase = attr.replace(/-([a-z])/g, g => g[1].toUpperCase());
                theme[camelCase] = value;
            }
        });
        
        // Auto-create container if doesn't exist
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initWidget);
        } else {
            initWidget();
        }
        
        function initWidget() {
            let container = document.getElementById(containerId);
            
            if (!container) {
                container = document.createElement('div');
                container.id = containerId;
                if (currentScript.parentNode) {
                    currentScript.parentNode.insertBefore(container, currentScript);
                } else {
                    document.body.appendChild(container);
                }
            }
            
            // Initialize widget
            window.patientWidgetInstance = new PatientWidget({
                containerId: containerId,
                apiKey: apiKey,
                theme: theme
            });
        }
    })();
    
    // Manual initialization helper
    window.initPatientWidget = function(options) {
        return new PatientWidget(options);
    };
})();