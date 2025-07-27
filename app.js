// Global variables
        let tutors = [];
        const API_BASE_URL = 'http://localhost:3000/api';
        
        // Device fingerprinting function
        function generateDeviceFingerprint() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.fillText('TutoRate Device ID', 2, 2);
            
            // Create a stable fingerprint without timestamp
            const stableFingerprint = {
                userAgent: navigator.userAgent,
                language: navigator.language,
                platform: navigator.platform,
                screenResolution: `${screen.width}x${screen.height}`,
                colorDepth: screen.colorDepth,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                canvasFingerprint: canvas.toDataURL(),
                cookieEnabled: navigator.cookieEnabled,
                doNotTrack: navigator.doNotTrack,
                hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
                deviceMemory: navigator.deviceMemory || 'unknown'
            };
            
            // Create a hash of the stable fingerprint data
            const fingerprintString = JSON.stringify(stableFingerprint);
            let hash = 0;
            for (let i = 0; i < fingerprintString.length; i++) {
                const char = fingerprintString.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32-bit integer
            }
            
            // Add timestamp to the full device info for record keeping
            const fullDeviceInfo = {
                ...stableFingerprint,
                timestamp: Date.now()
            };
            
            return {
                deviceId: Math.abs(hash).toString(36),
                deviceInfo: fullDeviceInfo
            };
        }
        
        // Fetch tutors from API
        async function fetchTutors() {
            try {
                const response = await fetch(`${API_BASE_URL}/tutors`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                tutors = await response.json();
                console.log('Tutors loaded:', tutors.length);
            } catch (error) {
                console.error('Error fetching tutors:', error);
                // Fallback to empty array if API fails
                tutors = [];
                alert('Failed to load tutors. Please make sure the server is running on http://localhost:3000');
            }
        }
        
        // Rating categories
        const ratingCategories = [
            { id: "communication", name: "Communication" },
            { id: "experience", name: "Classroom Experience" },
            { id: "clarity", name: "Teaching Clarity" },
            { id: "punctuality", name: "Punctuality" },
            { id: "satisfaction", name: "Overall Satisfaction" }
        ];
        
        // DOM Elements
        const header = document.getElementById('header');
        const themeToggle = document.getElementById('theme-toggle');
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        const mobileNavOverlay = document.getElementById('mobile-nav-overlay');
        const mobileNavClose = document.getElementById('mobile-nav-close');
        const searchInput = document.getElementById('search-input');
        const searchClear = document.getElementById('search-clear');
        const searchDropdown = document.getElementById('search-dropdown');
        const searchResults = document.getElementById('search-results');
        const sortSelect = document.getElementById('sort-select');
        const tutorsGrid = document.getElementById('tutors-grid');
        const paginationEl = document.getElementById('pagination');
        const ratingModal = document.getElementById('rating-modal');
        const closeModal = document.getElementById('close-modal');
        const cancelRating = document.getElementById('cancel-rating');
        const submitRating = document.getElementById('submit-rating');
        const modalTutorInfo = document.getElementById('modal-tutor-info');
        const ratingCategoriesContainer = document.getElementById('rating-categories');
        
        // Email modal elements
        const emailModal = document.getElementById('email-modal');
        const closeEmailModal = document.getElementById('close-email-modal');
        const emailInput = document.getElementById('email-input');
        const confirmEmail = document.getElementById('confirm-email');
        const cancelEmail = document.getElementById('cancel-email');
        const emailError = document.getElementById('email-error');
        
        // Success modal elements
        const successModal = document.getElementById('success-modal');
        const closeSuccessModal = document.getElementById('close-success-modal');
        const successMessage = document.getElementById('success-message');
        const successRating = document.getElementById('success-rating');
        
        // Current state
        let currentTutor = null;
        let currentRatings = {
            communication: 0,
            experience: 0,
            clarity: 0,
            punctuality: 0,
            satisfaction: 0
        };
        let currentPage = 1;
        const tutorsPerPage = 9; // 3x3 grid
        
        // Search state
        let searchTimeout = null;
        let selectedTutorId = null;
        
        // Initialize the page
        async function init() {
            await fetchTutors();
            renderTutors();
            setupPagination();
            setupEventListeners();
        }
        
        // Render tutors to the grid (always show all tutors)
        function renderTutors() {
            const sortedTutors = sortTutors();
            const paginatedTutors = paginateTutors(sortedTutors);
            
            tutorsGrid.innerHTML = '';
            
            paginatedTutors.forEach((tutor, index) => {
                const card = document.createElement('div');
                card.className = 'tutor-card';
                
                card.innerHTML = `
                    <div class="rating-badge"><i class="fas fa-star"></i> ${tutor.rating}</div>
                    <div class="tutor-image" style="background-image: url('${tutor.image}')"></div>
                    <div class="card-content">
                        <div class="tutor-name">
                            <h3>${tutor.name}</h3>
                        </div>
                        <div class="subject">${tutor.subject}</div>
                        <div class="location"><i class="fas fa-map-marker-alt"></i> ${tutor.location}</div>
                        <div class="faculty"><i class="fas fa-university"></i> ${tutor.faculty}</div>
                        <button class="btn btn-primary rate-btn" data-id="${tutor.id}">RATE THIS TUTOR</button>
                    </div>
                `;
                tutorsGrid.appendChild(card);
                
                // Animate cards with staggered delay
                setTimeout(() => {
                    card.classList.add('visible');
                }, 150 * index);
            });
            
            // Add event listeners to rate buttons
            document.querySelectorAll('.rate-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const tutorId = parseInt(e.target.dataset.id);
                    openRatingModal(tutorId);
                });
            });
        }
        
        // Setup pagination
        function setupPagination() {
            const sortedTutors = sortTutors();
            const pageCount = Math.ceil(sortedTutors.length / tutorsPerPage);
            
            paginationEl.innerHTML = '';
            
            for (let i = 1; i <= pageCount; i++) {
                const button = document.createElement('button');
                button.className = 'page-btn';
                if (i === currentPage) button.classList.add('active');
                button.textContent = i;
                button.addEventListener('click', () => {
                    currentPage = i;
                    renderTutors();
                    setupPagination();
                    const tutorsSection = document.querySelector('.tutors-section');
                    window.scrollTo({ top: tutorsSection.offsetTop - 100, behavior: 'smooth' });
                });
                paginationEl.appendChild(button);
            }
        }
        
        // Paginate tutors
        function paginateTutors(tutorsArray) {
            const startIndex = (currentPage - 1) * tutorsPerPage;
            const endIndex = startIndex + tutorsPerPage;
            return tutorsArray.slice(startIndex, endIndex);
        }
        
        // Sort tutors based on selected option
        function sortTutors() {
            const sortValue = sortSelect.value;
            let sortedTutors = [...tutors];
            
            switch(sortValue) {
                case 'highest':
                    sortedTutors.sort((a, b) => b.rating - a.rating);
                    break;
                case 'lowest':
                    sortedTutors.sort((a, b) => a.rating - b.rating);
                    break;
                case 'name-asc':
                    sortedTutors.sort((a, b) => a.name.localeCompare(b.name));
                    break;
                case 'name-desc':
                    sortedTutors.sort((a, b) => b.name.localeCompare(a.name));
                    break;
                case 'relevance':
                default:
                    // Default sorting by rating (highest first)
                    sortedTutors.sort((a, b) => b.rating - a.rating);
                    break;
            }
            
            return sortedTutors;
        }
        
        // Search tutors for dropdown suggestions
        function searchTutorsForDropdown(searchTerm) {
            if (!searchTerm || searchTerm.length < 2) {
                return [];
            }
            
            const term = searchTerm.toLowerCase();
            return tutors.filter(tutor => {
                const searchFields = [
                    tutor.name.toLowerCase(),
                    tutor.subject.toLowerCase(),
                    tutor.location.toLowerCase(),
                    tutor.faculty.toLowerCase()
                ];
                
                return searchFields.some(field => field.includes(term));
            }).slice(0, 8); // Limit to 8 results
        }
        
        // Highlight search terms in text
        function highlightSearchTerm(text, searchTerm) {
            if (!searchTerm) return text;
            
            const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
            return text.replace(regex, '<span class="search-highlight">$1</span>');
        }
        
        // Show search dropdown with results
        function showSearchDropdown(searchTerm) {
            const results = searchTutorsForDropdown(searchTerm);
            
            if (results.length === 0) {
                searchResults.innerHTML = `
                    <div class="no-search-results">
                        <i class="fas fa-search"></i>
                        <p>No tutors found for "${searchTerm}"</p>
                    </div>
                `;
            } else {
                searchResults.innerHTML = results.map(tutor => `
                    <div class="search-result-item" data-tutor-id="${tutor.id}">
                        <div class="search-result-avatar" style="background-image: url('${tutor.image}')"></div>
                        <div class="search-result-info">
                            <div class="search-result-name">${highlightSearchTerm(tutor.name, searchTerm)}</div>
                            <div class="search-result-details">
                                <span class="search-result-subject">${highlightSearchTerm(tutor.subject, searchTerm)}</span>
                                <span>•</span>
                                <span>${highlightSearchTerm(tutor.location, searchTerm)}</span>
                                <span>•</span>
                                <span class="search-result-rating">
                                    ${tutor.rating}
                                </span>
                            </div>
                        </div>
                    </div>
                `).join('');
                
                // Add click listeners to search results
                document.querySelectorAll('.search-result-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const tutorId = parseInt(item.dataset.tutorId);
                        selectTutorFromSearch(tutorId);
                    });
                });
            }
            
            searchDropdown.style.display = 'block';
        }
        
        // Hide search dropdown
        function hideSearchDropdown() {
            searchDropdown.style.display = 'none';
        }
        
        // Select tutor from search and open rating modal
        function selectTutorFromSearch(tutorId) {
            selectedTutorId = tutorId;
            const tutor = tutors.find(t => t.id === tutorId);

            if (tutor) {
                hideSearchDropdown();
                openRatingModal(tutor.id);
            }
        }
        
        // Highlight a specific tutor card
        function highlightTutorCard(tutorId) {
            // Remove any existing highlights
            document.querySelectorAll('.tutor-card.highlighted').forEach(card => {
                card.classList.remove('highlighted');
            });
            
            // Find and highlight the target card
            const targetCard = document.querySelector(`[data-id="${tutorId}"]`)?.closest('.tutor-card');
            if (targetCard) {
                targetCard.classList.add('highlighted');
                targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                // Remove highlight after 3 seconds
                setTimeout(() => {
                    targetCard.classList.remove('highlighted');
                }, 3000);
            }
        }
        
        // Open rating modal
        function openRatingModal(tutorId) {
            currentTutor = tutors.find(tutor => tutor.id === tutorId);
            
            // Reset ratings
            currentRatings = {
                communication: 0,
                experience: 0,
                clarity: 0,
                punctuality: 0,
                satisfaction: 0
            };
            
            // Update modal content
            modalTutorInfo.innerHTML = `
                <div class="tutor-info-header">
                    <div class="tutor-avatar">
                        <img src="${currentTutor.image}" alt="${currentTutor.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                        <div class="avatar-fallback" style="display: none;">
                            ${currentTutor.name.charAt(0)}
                        </div>
                    </div>
                    <div class="tutor-details">
                        <h3 class="tutor-name">${currentTutor.name}</h3>
                        <div class="tutor-subject">${currentTutor.subject}</div>
                        <div class="tutor-meta">
                            <span class="meta-item"><i class="fas fa-map-marker-alt"></i> ${currentTutor.location}</span>
                            <span class="meta-item"><i class="fas fa-university"></i> ${currentTutor.faculty}</span>
                        </div>
                        <div class="current-rating">
                            <i class="fas fa-star"></i> ${currentTutor.rating}
                            <span class="review-count">(${currentTutor.reviews} reviews)</span>
                        </div>
                    </div>
                </div>
            `;
            
            // Render rating categories
            ratingCategoriesContainer.innerHTML = '';
            ratingCategories.forEach(category => {
                const categoryEl = document.createElement('div');
                categoryEl.className = 'rating-category';
                categoryEl.innerHTML = `
                    <h4>${category.name}</h4>
                    <div class="rating-row">
                        <div class="stars" data-category="${category.id}">
                            <span class="star" data-rating="1">☆</span>
                            <span class="star" data-rating="2">☆</span>
                            <span class="star" data-rating="3">☆</span>
                            <span class="star" data-rating="4">☆</span>
                            <span class="star" data-rating="5">☆</span>
                        </div>
                        <div class="rating-display" data-category="${category.id}">
                            Not rated
                        </div>
                    </div>
                `;
                ratingCategoriesContainer.appendChild(categoryEl);
            });
            
            // Add event listeners to stars
            document.querySelectorAll('.star').forEach(star => {
                // Click event
                star.addEventListener('click', (e) => {
                    const rating = parseInt(e.target.dataset.rating);
                    const category = e.target.parentElement.dataset.category;
                    const categoryEl = e.target.closest('.rating-category');
                    
                    // Update current rating for this category
                    currentRatings[category] = rating;
                    
                    // Update stars display for this category
                    const stars = e.target.parentElement.querySelectorAll('.star');
                    stars.forEach((s, index) => {
                        if (index < rating) {
                            s.textContent = '★';
                            s.classList.add('selected');
                        } else {
                            s.textContent = '☆';
                            s.classList.remove('selected');
                        }
                    });
                    
                    // Update rating display
                    const displayEl = categoryEl.querySelector('.rating-display');
                    const ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
                    displayEl.textContent = `${rating}/5 - ${ratingLabels[rating]}`;
                    displayEl.classList.add('has-rating');
                    
                    // Add visual feedback
                    categoryEl.style.transform = 'scale(1.02)';
                    setTimeout(() => {
                        categoryEl.style.transform = '';
                    }, 200);
                    
                    // Check if all categories are rated and enable submit button
                    updateSubmitButtonState();
                });
                
                // Hover effects for better UX
                star.addEventListener('mouseenter', (e) => {
                    const rating = parseInt(e.target.dataset.rating);
                    const stars = e.target.parentElement.querySelectorAll('.star');
                    
                    stars.forEach((s, index) => {
                        if (index < rating) {
                            s.style.color = 'var(--accent-2)';
                            s.style.transform = 'scale(1.1)';
                        }
                    });
                });
                
                star.addEventListener('mouseleave', (e) => {
                    const category = e.target.parentElement.dataset.category;
                    const currentRating = currentRatings[category];
                    const stars = e.target.parentElement.querySelectorAll('.star');
                    
                    stars.forEach((s, index) => {
                        if (index < currentRating) {
                            s.style.color = 'var(--accent-2)';
                        } else {
                            s.style.color = '#e0e0e0';
                        }
                        s.style.transform = '';
                    });
                });
            });
            
            // Show modal
            ratingModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
        
        // Close rating modal
        function closeRatingModal() {
            ratingModal.classList.remove('active');
            document.body.style.overflow = 'auto';
            currentTutor = null;
        }
        
        // Email modal functions
        function openEmailModal() {
            emailInput.value = '';
            clearEmailError();
            emailModal.classList.add('active');
            emailInput.focus();
        }
        
        function closeEmailModalFunc() {
            emailModal.classList.remove('active');
            emailInput.value = '';
            clearEmailError();
        }
        
        function showEmailError(message) {
            emailError.textContent = message;
            emailInput.classList.add('error');
        }
        
        function clearEmailError() {
            emailError.textContent = '';
            emailInput.classList.remove('error');
        }
        
        function isValidEmail(email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        }
        
        // Success modal functions
        function openSuccessModal(tutorName, averageRating, isUpdate) {
            // Update success message
            const message = isUpdate
                ? `Your rating for ${tutorName} has been updated!`
                : `Thank you for rating ${tutorName}!`;
            successMessage.textContent = message;
            
            // Update rating display
            successRating.innerHTML = `
                <i class="fas fa-star"></i>
                Your Rating: ${averageRating.toFixed(1)}/5
            `;
            
            // Show success modal
            successModal.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // Add event listener to prevent closing on outside click
            successModal.addEventListener('click', (e) => {
                // Only allow closing when clicking the Continue button
                if (e.target === closeSuccessModal) {
                    closeSuccessModalFunc();
                }
                // Prevent event bubbling to avoid closing modal
                e.stopPropagation();
            });
        }
        
        function closeSuccessModalFunc() {
            successModal.classList.remove('active');
            document.body.style.overflow = 'auto';
            closeRatingModal();
        }
        
        // Update submit button state based on ratings
        function updateSubmitButtonState() {
            const values = Object.values(currentRatings);
            const allRated = values.every(rating => rating > 0);
            
            if (allRated) {
                submitRating.disabled = false;
                submitRating.classList.add('enabled');
                submitRating.textContent = 'Submit Rating';
            } else {
                submitRating.disabled = true;
                submitRating.classList.remove('enabled');
                const ratedCount = values.filter(rating => rating > 0).length;
                submitRating.textContent = `Rate All Categories (${ratedCount}/${values.length})`;
            }
        }
        
        // Show rating error with better UX
        function showRatingError(message) {
            // Create error notification
            const errorDiv = document.createElement('div');
            errorDiv.className = 'rating-error-notification';
            errorDiv.innerHTML = `
                <i class="fas fa-exclamation-triangle"></i>
                <span>${message}</span>
            `;
            
            // Add to modal
            const modalBody = document.querySelector('.modal-body');
            modalBody.insertBefore(errorDiv, modalBody.firstChild);
            
            // Remove after 3 seconds
            setTimeout(() => {
                errorDiv.remove();
            }, 3000);
            
            // Highlight unrated categories
            const values = Object.values(currentRatings);
            const categories = Object.keys(currentRatings);
            categories.forEach((category, index) => {
                if (values[index] === 0) {
                    const categoryEl = document.querySelector(`[data-category="${category}"]`).closest('.rating-category');
                    categoryEl.classList.add('highlight-required');
                    setTimeout(() => {
                        categoryEl.classList.remove('highlight-required');
                    }, 3000);
                }
            });
        }
        
        // Show cooldown error with better UX
        function showCooldownError(message, nextRatingDate) {
            // Create cooldown error notification
            const errorDiv = document.createElement('div');
            errorDiv.className = 'cooldown-error-notification';
            errorDiv.innerHTML = `
                <i class="fas fa-clock"></i>
                <div class="cooldown-content">
                    <h4>Rating Cooldown Active</h4>
                    <p>${message}</p>
                    <small>You can rate this tutor again on ${new Date(nextRatingDate).toLocaleDateString()}</small>
                </div>
            `;
            
            // Add to body with overlay
            const overlay = document.createElement('div');
            overlay.className = 'cooldown-overlay';
            overlay.appendChild(errorDiv);
            document.body.appendChild(overlay);
            
            // Auto-remove after 5 seconds or on click
            const removeError = () => {
                overlay.remove();
            };
            
            setTimeout(removeError, 5000);
            overlay.addEventListener('click', removeError);
            
            // Apply minimal inline styles only for positioning
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                cursor: pointer;
            `;
        }
        
        // Setup smooth scrolling for navigation links
        function setupSmoothScrolling() {
            const navLinks = document.querySelectorAll('nav a[href^="#"]');
            
            navLinks.forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    
                    const targetId = link.getAttribute('href').substring(1);
                    const targetSection = document.getElementById(targetId);
                    
                    if (targetSection) {
                        const headerHeight = header.offsetHeight;
                        const targetPosition = targetSection.offsetTop - headerHeight - 20;
                        
                        window.scrollTo({
                            top: targetPosition,
                            behavior: 'smooth'
                        });
                        
                        // Update active link
                        updateActiveNavLink(targetId);
                    }
                });
            });
        }
        
        // Update active navigation link based on scroll position
        function updateActiveNavLink(activeId = null) {
            const navLinks = document.querySelectorAll('nav a[href^="#"]');
            const sections = ['home', 'tutors', 'contact'];
            
            if (activeId) {
                // Manually set active link
                navLinks.forEach(link => {
                    const linkTarget = link.getAttribute('href').substring(1);
                    if (linkTarget === activeId) {
                        link.classList.add('active');
                    } else {
                        link.classList.remove('active');
                    }
                });
                return;
            }
            
            // Auto-detect active section based on scroll position
            const scrollPosition = window.scrollY + header.offsetHeight + 100;
            let currentSection = 'home';
            
            sections.forEach(sectionId => {
                const section = document.getElementById(sectionId);
                if (section && scrollPosition >= section.offsetTop) {
                    currentSection = sectionId;
                }
            });
            
            // Update active class
            navLinks.forEach(link => {
                const linkTarget = link.getAttribute('href').substring(1);
                if (linkTarget === currentSection) {
                    link.classList.add('active');
                } else {
                    link.classList.remove('active');
                }
            });
        }
        
        // Debounced search function for dropdown
        function debouncedSearch(callback, delay = 300) {
            return function(...args) {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    callback.apply(this, args);
                }, delay);
            };
        }
        
        // Update search clear button visibility
        function updateSearchClearButton() {
            if (searchInput.value.trim()) {
                searchClear.style.display = 'block';
            } else {
                searchClear.style.display = 'none';
            }
        }
        
        // Clear search
        function clearSearch() {
            searchInput.value = '';
            selectedTutorId = null;
            hideSearchDropdown();
            updateSearchClearButton();
            
            // Remove any highlights
            document.querySelectorAll('.tutor-card.highlighted').forEach(card => {
                card.classList.remove('highlighted');
            });
        }
        
        // Update active search item for keyboard navigation
        function updateActiveSearchItem(items, activeIndex) {
            items.forEach((item, index) => {
                if (index === activeIndex) {
                    item.classList.add('active');
                    item.scrollIntoView({ block: 'nearest' });
                } else {
                    item.classList.remove('active');
                }
            });
        }
        
        // Mobile navigation functions
        function openMobileNav() {
            mobileNavOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
        
        function closeMobileNav() {
            mobileNavOverlay.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
        
        // Setup mobile navigation
        function setupMobileNavigation() {
            // Mobile menu button
            mobileMenuBtn.addEventListener('click', openMobileNav);
            
            // Close mobile nav
            mobileNavClose.addEventListener('click', closeMobileNav);
            
            // Close on overlay click
            mobileNavOverlay.addEventListener('click', (e) => {
                if (e.target === mobileNavOverlay) {
                    closeMobileNav();
                }
            });
            
            // Mobile nav links
            document.querySelectorAll('.mobile-nav-link').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    
                    const targetId = link.getAttribute('href').substring(1);
                    const targetSection = document.getElementById(targetId);
                    
                    if (targetSection) {
                        closeMobileNav();
                        
                        // Wait for nav to close, then scroll
                        setTimeout(() => {
                            const headerHeight = header.offsetHeight;
                            const targetPosition = targetSection.offsetTop - headerHeight - 20;
                            
                            window.scrollTo({
                                top: targetPosition,
                                behavior: 'smooth'
                            });
                            
                            // Update active link
                            updateActiveNavLink(targetId);
                            updateMobileNavActiveLink(targetId);
                        }, 300);
                    }
                });
            });
        }
        
        // Update mobile nav active link
        function updateMobileNavActiveLink(activeId) {
            document.querySelectorAll('.mobile-nav-link').forEach(link => {
                const linkTarget = link.getAttribute('href').substring(1);
                if (linkTarget === activeId) {
                    link.classList.add('active');
                } else {
                    link.classList.remove('active');
                }
            });
        }
        
        // Handle window resize
        function handleWindowResize() {
            // Close mobile nav if window becomes large
            if (window.innerWidth > 768 && mobileNavOverlay.classList.contains('active')) {
                closeMobileNav();
            }
        }
        
        // Setup event listeners
        function setupEventListeners() {
            // Navigation smooth scrolling
            setupSmoothScrolling();
            
            // Header shrink on scroll and active nav highlighting
            window.addEventListener('scroll', () => {
                if (window.scrollY > 50) {
                    header.classList.add('shrink');
                } else {
                    header.classList.remove('shrink');
                }
                
                // Update active navigation link
                updateActiveNavLink();
                
                // Update mobile nav active link based on scroll
                const sections = ['home', 'tutors', 'contact'];
                const headerHeight = header.offsetHeight;
                const scrollPosition = window.scrollY + headerHeight + 100;
                let currentSection = 'home';
                
                sections.forEach(sectionId => {
                    const section = document.getElementById(sectionId);
                    if (section && scrollPosition >= section.offsetTop) {
                        currentSection = sectionId;
                    }
                });
                
                updateMobileNavActiveLink(currentSection);
            });
            
            // Theme toggle
            themeToggle.addEventListener('click', () => {
                const isDark = document.body.getAttribute('data-theme') === 'dark';
                document.body.setAttribute('data-theme', isDark ? 'light' : 'dark');
                themeToggle.innerHTML = isDark ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
            });
            
            // Search functionality with dropdown
            const debouncedShowDropdown = debouncedSearch((searchTerm) => {
                if (searchTerm.length >= 2) {
                    showSearchDropdown(searchTerm);
                } else {
                    hideSearchDropdown();
                }
            });
            
            searchInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.trim();
                updateSearchClearButton();
                
                if (searchTerm) {
                    debouncedShowDropdown(searchTerm);
                } else {
                    hideSearchDropdown();
                    selectedTutorId = null;
                    // Remove any highlights
                    document.querySelectorAll('.tutor-card.highlighted').forEach(card => {
                        card.classList.remove('highlighted');
                    });
                }
            });
            
            // Search input focus and blur events
            searchInput.addEventListener('focus', () => {
                const searchTerm = searchInput.value.trim();
                if (searchTerm.length >= 2) {
                    showSearchDropdown(searchTerm);
                }
            });
            
            searchInput.addEventListener('blur', (e) => {
                // Delay hiding to allow clicking on dropdown items
                setTimeout(() => {
                    if (!e.relatedTarget || !e.relatedTarget.closest('.search-dropdown')) {
                        hideSearchDropdown();
                    }
                }, 150);
            });
            
            // Search clear button
            searchClear.addEventListener('click', clearSearch);
            
            // Hide dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.search-container')) {
                    hideSearchDropdown();
                }
            });
            
            // Keyboard navigation for search dropdown
            searchInput.addEventListener('keydown', (e) => {
                const items = document.querySelectorAll('.search-result-item');
                const activeItem = document.querySelector('.search-result-item.active');
                let currentIndex = activeItem ? Array.from(items).indexOf(activeItem) : -1;
                
                switch(e.key) {
                    case 'ArrowDown':
                        e.preventDefault();
                        currentIndex = Math.min(currentIndex + 1, items.length - 1);
                        updateActiveSearchItem(items, currentIndex);
                        break;
                    case 'ArrowUp':
                        e.preventDefault();
                        currentIndex = Math.max(currentIndex - 1, 0);
                        updateActiveSearchItem(items, currentIndex);
                        break;
                    case 'Enter':
                        e.preventDefault();
                        if (activeItem) {
                            const tutorId = parseInt(activeItem.dataset.tutorId);
                            selectTutorFromSearch(tutorId);
                        }
                        break;
                    case 'Escape':
                        hideSearchDropdown();
                        searchInput.blur();
                        break;
                }
            });
            
            // Sort functionality
            sortSelect.addEventListener('change', () => {
                currentPage = 1;
                renderTutors();
                setupPagination();
            });
            
            // Modal functionality
            closeModal.addEventListener('click', closeRatingModal);
            cancelRating.addEventListener('click', closeRatingModal);
            
            // Submit rating
            submitRating.addEventListener('click', () => {
                // Validate that all categories are rated
                const values = Object.values(currentRatings);
                if (values.some(rating => rating === 0)) {
                    showRatingError('Please rate all categories before submitting.');
                    return;
                }
                
                // Show email modal
                openEmailModal();
            });
            
            // Initialize submit button state
            updateSubmitButtonState();
            
            // Email modal functionality
            closeEmailModal.addEventListener('click', closeEmailModalFunc);
            cancelEmail.addEventListener('click', closeEmailModalFunc);
            
            // Success modal functionality
            closeSuccessModal.addEventListener('click', closeSuccessModalFunc);
            
            confirmEmail.addEventListener('click', async () => {
                const email = emailInput.value.trim();
                
                // Validate email
                if (!email) {
                    showEmailError('Please enter your email address.');
                    return;
                }
                
                if (!isValidEmail(email)) {
                    showEmailError('Please enter a valid email address.');
                    return;
                }
                
                // Clear error and close email modal
                clearEmailError();
                closeEmailModalFunc();
                
                // Calculate average rating
                const values = Object.values(currentRatings);
                const averageRating = (values.reduce((a, b) => a + b, 0) / values.length);
                
                try {
                    // Generate device fingerprint
                    const deviceData = generateDeviceFingerprint();
                    
                    // Submit rating to backend
                    const response = await fetch(`${API_BASE_URL}/ratings`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            tutorId: currentTutor.id,
                            rating: averageRating,
                            reviewText: `Communication: ${currentRatings.communication}/5, Experience: ${currentRatings.experience}/5, Clarity: ${currentRatings.clarity}/5, Punctuality: ${currentRatings.punctuality}/5, Satisfaction: ${currentRatings.satisfaction}/5`,
                            email: email,
                            deviceId: deviceData.deviceId,
                            deviceInfo: deviceData.deviceInfo
                        })
                    });
                    
                    if (!response.ok) {
                        if (response.status === 429) {
                            // Handle cooldown error
                            const errorData = await response.json();
                            showCooldownError(errorData.message, errorData.nextRatingDate);
                            return;
                        }
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    
                    const result = await response.json();
                    
                    // Update local tutor data
                    await fetchTutors();
                    renderTutors();
                    setupPagination();
                    
                    // Create confetti effect
                    createConfetti();
                    
                    // Show success modal after a short delay
                    setTimeout(() => {
                        openSuccessModal(currentTutor.name, averageRating, result.updated);
                    }, 500);
                    
                } catch (error) {
                    console.error('Error submitting rating:', error);
                    alert('Failed to submit rating. Please make sure the server is running and try again.');
                }
            });
            
            // Newsletter form submission
            const newsletterForm = document.getElementById('newsletter-form');
            if (newsletterForm) {
                newsletterForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const email = e.target.querySelector('input[type="email"]').value;
                    if (email) {
                        alert('Thank you for subscribing! We will keep you updated.');
                        e.target.reset();
                    }
                });
            }
            
            // Mobile navigation
            setupMobileNavigation();
            
            // Window resize handler
            window.addEventListener('resize', handleWindowResize);
            
            // Prevent escape key from closing success modal
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && successModal.classList.contains('active')) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            });
        }
        
        // Confetti effect
        function createConfetti() {
            const confettiCount = 100;
            const confettiContainer = document.createElement('div');
            confettiContainer.style.position = 'fixed';
            confettiContainer.style.top = '0';
            confettiContainer.style.left = '0';
            confettiContainer.style.width = '100%';
            confettiContainer.style.height = '100%';
            confettiContainer.style.pointerEvents = 'none';
            confettiContainer.style.zIndex = '9999';
            document.body.appendChild(confettiContainer);
            
            const colors = ['#1ABC9C', '#FFC107', '#3498db', '#e74c3c', '#9b59b6'];
            
            for (let i = 0; i < confettiCount; i++) {
                const confetti = document.createElement('div');
                confetti.style.position = 'absolute';
                confetti.style.width = '10px';
                confetti.style.height = '10px';
                confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                confetti.style.borderRadius = '2px';
                confetti.style.left = `${Math.random() * 100}vw`;
                confetti.style.top = '-10px';
                confetti.style.opacity = '0';
                confettiContainer.appendChild(confetti);
                
                // Animate confetti
                const animation = confetti.animate([
                    { opacity: 0, transform: 'translateY(0) rotate(0deg)' },
                    { opacity: 1, transform: `translateY(${Math.random() * 100 + 50}vh) rotate(${Math.random() * 360}deg)` }
                ], {
                    duration: 1000 + Math.random() * 2000,
                    easing: 'cubic-bezier(0.1, 0.8, 0.2, 1)'
                });
                
                // Remove after animation
                animation.onfinish = () => {
                    confetti.remove();
                    if (i === confettiCount - 1) {
                        setTimeout(() => {
                            confettiContainer.remove();
                        }, 500);
                    }
                };
            }
        }
        
        // Initialize the application
        document.addEventListener('DOMContentLoaded', init);
