class PromotedSlider {
  constructor() {
    this.slider = null;
    this.slides = [];
    this.currentIndex = 0;
    this.isTransitioning = false;
    
    // Drag properties
    this.isDragging = false;
    this.startX = 0;
    this.currentX = 0;
    this.initialTransform = 0;
    this.dragThreshold = 50;
    this.hasDragged = false;
    
    this.init();
  }

  init() {
    // Đợi DOM sẵn sàng
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  }

  setup() {
    // Tìm slider
    this.slider = document.querySelector('[data-promoted-slider]');
    if (!this.slider) return;

    // Lấy slides
    this.slides = Array.from(this.slider.children);
    if (this.slides.length === 0) return;

    // Promoted slider: Found slides

    // Setup
    this.setupCSS();
    this.createNavigationArrows();
    this.createIndicators();
    this.addEventListeners();
  }

  setupCSS() {
    // CSS cho slider
    this.slider.style.display = 'flex';
    this.slider.style.transition = 'transform 0.3s ease';
    this.slider.style.cursor = 'grab';
    
    // CSS cho slides
    this.slides.forEach(slide => {
      slide.style.flexShrink = '0';
      slide.style.width = this.getSlideWidth();
    });
  }

  getSlideWidth() {
    if (window.innerWidth >= 1024) return '33.333333%'; // 3 slides
    if (window.innerWidth >= 640) return '50%';         // 2 slides
    return '100%';                                      // 1 slide
  }

  getSlidesPerPage() {
    if (window.innerWidth >= 1024) return 3;
    if (window.innerWidth >= 640) return 2;
    return 1;
  }

  getTotalPages() {
    return Math.ceil(this.slides.length / this.getSlidesPerPage());
  }

  createNavigationArrows() {
    const container = document.querySelector('.promoted-slider-container');
    if (!container) return;

    // Only show arrows if we have more than one page
    const totalPages = this.getTotalPages();
    if (totalPages <= 1) return;

    // Remove existing arrows
    const existingNav = container.querySelector('.slider-navigation');
    if (existingNav) existingNav.remove();

    // Create navigation container
    const navDiv = document.createElement('div');
    navDiv.className = 'slider-navigation absolute inset-0 flex items-center justify-between px-4 pointer-events-none opacity-0 transition-opacity duration-300';

    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'slider-prev pointer-events-auto bg-white/90 backdrop-blur-sm border-0 rounded-full w-12 h-12 flex items-center justify-center cursor-pointer transition-all duration-300 shadow-lg hover:bg-white hover:scale-110 active:scale-95';
    prevBtn.innerHTML = `
      <svg class="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
      </svg>
    `;
    prevBtn.addEventListener('click', () => this.goToPrevious());

    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'slider-next pointer-events-auto bg-white/90 backdrop-blur-sm border-0 rounded-full w-12 h-12 flex items-center justify-center cursor-pointer transition-all duration-300 shadow-lg hover:bg-white hover:scale-110 active:scale-95';
    nextBtn.innerHTML = `
      <svg class="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
      </svg>
    `;
    nextBtn.addEventListener('click', () => this.goToNext());

    navDiv.appendChild(prevBtn);
    navDiv.appendChild(nextBtn);
    container.appendChild(navDiv);

    // Show arrows on hover
    container.addEventListener('mouseenter', () => {
      navDiv.style.opacity = '1';
    });
    container.addEventListener('mouseleave', () => {
      navDiv.style.opacity = '0';
    });
  }

  createIndicators() {
    const container = document.querySelector('.promoted-slider-container');
    if (!container) return;

    const totalPages = this.getTotalPages();
    if (totalPages <= 1) return;

    // Xóa indicators cũ
    const oldIndicators = container.querySelector('.slider-indicators');
    if (oldIndicators) oldIndicators.remove();

    // Tạo indicators mới
    const indicatorsDiv = document.createElement('div');
    indicatorsDiv.className = 'slider-indicators flex justify-center space-x-2 mt-6';
    
    for (let i = 0; i < totalPages; i++) {
      const dot = document.createElement('button');
      dot.className = `w-2 h-2 rounded-full transition-colors duration-300 ${i === 0 ? 'bg-katana-primary' : 'bg-gray-300'}`;
      dot.addEventListener('click', () => this.goToPage(i));
      indicatorsDiv.appendChild(dot);
    }

    container.appendChild(indicatorsDiv);
  }

  updateIndicators() {
    const indicators = document.querySelectorAll('.slider-indicators button');
    const currentPage = Math.floor(this.currentIndex / this.getSlidesPerPage());
    
    indicators.forEach((dot, index) => {
      if (index === currentPage) {
        dot.className = 'w-2 h-2 rounded-full transition-colors duration-300 bg-katana-primary';
      } else {
        dot.className = 'w-2 h-2 rounded-full transition-colors duration-300 bg-gray-300';
      }
    });
  }

  goToPage(pageIndex) {
    const slidesPerPage = this.getSlidesPerPage();
    this.currentIndex = pageIndex * slidesPerPage;
    this.updateSlider();
  }

  updateSlider() {
    if (this.isTransitioning) return;
    
    this.isTransitioning = true;
    
    const slideWidth = this.slides[0].offsetWidth;
    const translateX = -this.currentIndex * slideWidth;
    
    this.slider.style.transform = `translateX(${translateX}px)`;
    this.updateIndicators();
    
    setTimeout(() => {
      this.isTransitioning = false;
    }, 300);
  }

  handleResize() {
    // Update slide widths
    this.slides.forEach(slide => {
      slide.style.width = this.getSlideWidth();
    });
    
    // Recreate navigation arrows and indicators
    this.createNavigationArrows();
    this.createIndicators();
    
    // Reset position
    this.currentIndex = 0;
    this.updateSlider();
  }

  handleDragStart(e) {
    if (this.isTransitioning) return;
    
    this.isDragging = true;
    this.hasDragged = false;
    this.startX = this.getEventX(e);
    this.initialTransform = this.getCurrentTransform();
    
    // Don't change cursor or disable transitions yet - wait for actual drag
    
    // Only prevent default for mouse events, not touch events
    if (e.type === 'mousedown') {
      e.preventDefault();
    }
  }

  handleDragMove(e) {
    if (!this.isDragging) return;
    
    this.currentX = this.getEventX(e);
    const deltaX = this.currentX - this.startX;
    
    // Mark as dragged if moved more than 10px to avoid accidental drags
    if (Math.abs(deltaX) > 10 && !this.hasDragged) {
      this.hasDragged = true;
      // Now we know it's a real drag - setup drag UI
      this.slider.style.transition = 'none';
      this.slider.style.cursor = 'grabbing';
    }
    
    // Only proceed with drag logic if we've established this is a real drag
    if (!this.hasDragged) return;
    
    const slideWidth = this.slides[0].offsetWidth;
    const slidesPerPage = this.getSlidesPerPage();
    const maxIndex = this.slides.length - slidesPerPage;
    
    // Calculate boundaries
    const minTransform = -maxIndex * slideWidth; // Leftmost position
    const maxTransform = 0; // Rightmost position
    
    let newTransform = this.initialTransform + deltaX;
    
    // Apply resistance at boundaries
    if (newTransform > maxTransform) {
      // Dragging right beyond first slide - add resistance
      const excess = newTransform - maxTransform;
      newTransform = maxTransform + excess * 0.3; // 30% resistance
    } else if (newTransform < minTransform) {
      // Dragging left beyond last slide - add resistance
      const excess = minTransform - newTransform;
      newTransform = minTransform - excess * 0.3; // 30% resistance
    }
    
    // Apply transform
    this.slider.style.transform = `translateX(${newTransform}px)`;
    
    // Only prevent default if we're actually dragging (moved more than threshold)
    if (this.hasDragged) {
      e.preventDefault();
    }
  }

  handleDragEnd(e) {
    if (!this.isDragging) return;
    
    this.isDragging = false;
    
    // If this was never a real drag, just reset and exit
    if (!this.hasDragged) {
      // Reset cursor if it was changed
      this.slider.style.cursor = 'grab';
      return;
    }
    
    // Restore transition
    this.slider.style.transition = 'transform 0.3s ease';
    this.slider.style.cursor = 'grab';
    
    const deltaX = this.currentX - this.startX;
    const slideWidth = this.slides[0].offsetWidth;
    const slidesPerPage = this.getSlidesPerPage();
    const maxIndex = this.slides.length - slidesPerPage;
    
    // Check if we're at boundaries
    const atFirstSlide = this.currentIndex === 0;
    const atLastSlide = this.currentIndex >= maxIndex;
    
    // Determine if we should slide to next/prev
    if (Math.abs(deltaX) > this.dragThreshold) {
      if (deltaX > 0 && !atFirstSlide) {
        // Dragged right - go to previous (only if not at first slide)
        this.goToPrevious();
      } else if (deltaX < 0 && !atLastSlide) {
        // Dragged left - go to next (only if not at last slide)
        this.goToNext();
      } else {
        // At boundary - snap back to current position
        this.updateSlider();
      }
    } else {
      // Snap back to current position
      this.updateSlider();
    }
  }

  getEventX(e) {
    return e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
  }

  getCurrentTransform() {
    const transform = this.slider.style.transform;
    if (transform && transform.includes('translateX')) {
      const match = transform.match(/translateX\(([^)]+)\)/);
      return match ? parseFloat(match[1]) : 0;
    }
    return 0;
  }

  goToNext() {
    const slidesPerPage = this.getSlidesPerPage();
    const maxIndex = this.slides.length - slidesPerPage;
    
    if (this.currentIndex < maxIndex) {
      this.currentIndex += slidesPerPage;
      this.updateSlider();
    }
  }

  goToPrevious() {
    const slidesPerPage = this.getSlidesPerPage();
    
    if (this.currentIndex > 0) {
      this.currentIndex -= slidesPerPage;
      this.updateSlider();
    }
  }

  addEventListeners() {
    // Resize handler
    window.addEventListener('resize', () => this.handleResize());
    
    // Mouse events
    this.slider.addEventListener('mousedown', (e) => this.handleDragStart(e));
    this.slider.addEventListener('mousemove', (e) => this.handleDragMove(e));
    this.slider.addEventListener('mouseup', (e) => this.handleDragEnd(e));
    this.slider.addEventListener('mouseleave', (e) => this.handleDragEnd(e));
    
    // Touch events - use passive: true for better performance, handle preventDefault conditionally
    this.slider.addEventListener('touchstart', (e) => this.handleDragStart(e), { passive: true });
    this.slider.addEventListener('touchmove', (e) => this.handleDragMove(e), { passive: true });
    this.slider.addEventListener('touchend', (e) => this.handleDragEnd(e));
    
    // Prevent default drag behavior on images
    this.slider.addEventListener('dragstart', (e) => e.preventDefault());
    
    // Prevent clicks after drag - use capture phase to intercept before other handlers
    this.slider.addEventListener('click', (e) => {
      if (this.hasDragged) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation(); // Stop all other click handlers
        this.hasDragged = false; // Reset for next interaction
        return false;
      }
    }, true);
  }
}

// Khởi tạo slider
let promotedSlider = null;

function initSlider() {
  if (promotedSlider) return; // Chỉ khởi tạo 1 lần
  
  const sliderElement = document.querySelector('[data-promoted-slider]');
  if (sliderElement) {
    promotedSlider = new PromotedSlider();
  }
}

// Chạy khi DOM sẵn sàng
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSlider);
} else {
  initSlider();
}