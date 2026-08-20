// Universal Zoom Lightbox Component with Multi-Image Strip
export class UniversalLightbox {
    constructor() {
        this.lightboxEl = document.getElementById('zoom-lightbox');
        this.imgEl = document.getElementById('lightbox-img');
        this.labelEl = document.getElementById('lightbox-label');
        this.closeBtn = document.getElementById('close-lightbox');

        this.images = [];
        this.currentIndex = 0;
        this.meta = {};

        this.initEvents();
    }

    initEvents() {
        if (!this.lightboxEl) return;

        // Close on X button
        this.closeBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.close();
        });

        // Close on clicking backdrop outside image
        this.lightboxEl.addEventListener('click', (e) => {
            if (e.target === this.lightboxEl || e.target.classList.contains('lightbox-content')) {
                this.close();
            }
        });

        // Keyboard navigation (Escape, ArrowLeft, ArrowRight)
        window.addEventListener('keydown', (e) => {
            if (this.lightboxEl.classList.contains('hidden')) return;

            if (e.key === 'Escape') {
                this.close();
            } else if (e.key === 'ArrowLeft') {
                this.prev();
            } else if (e.key === 'ArrowRight') {
                this.next();
            }
        });
    }

    open(imagesInput, options = {}, nameArg = '', categoryArg = '') {
        if (!this.lightboxEl || !this.imgEl) return;

        if (typeof options === 'number') {
            this.meta = {
                initialIndex: options,
                name: nameArg,
                category: categoryArg,
                showCaption: Boolean(nameArg)
            };
        } else {
            this.meta = options || {};
            if (this.meta.name && this.meta.showCaption === undefined) {
                this.meta.showCaption = true;
            }
        }

        if (Array.isArray(imagesInput)) {
            this.images = imagesInput.filter(u => u && u.trim().length > 0);
        } else if (typeof imagesInput === 'string') {
            this.images = imagesInput ? [imagesInput] : [];
        } else {
            this.images = [];
        }

        this.currentIndex = this.meta.initialIndex || 0;
        if (this.currentIndex >= this.images.length) this.currentIndex = 0;

        this.renderImage();
        this.lightboxEl.classList.remove('hidden');
        document.body.classList.add('modal-open');
    }

    renderImage() {
        if (this.images.length === 0) return;

        const rawUrl = this.images[this.currentIndex];
        const currentUrl = rawUrl.replace(/\/(?:460|300|560)\//g, '/1280/');
        this.imgEl.src = currentUrl;
        this.imgEl.alt = this.meta.showCaption ? (this.meta.name || 'Image') : 'Game Image';

        // Render caption and thumbnail strip
        let captionHtml = '';
        if (this.meta.showCaption && this.meta.name) {
            captionHtml += `
                <div class="lightbox-caption">
                    <span class="lightbox-name">${this.meta.name}</span>
                    ${this.meta.category ? `<span class="badge badge-${this.meta.category}">${this.meta.category.toUpperCase()}</span>` : ''}
                    ${this.meta.label ? `<span class="badge" style="background: var(--bg-surface-elevated);">${this.meta.label}</span>` : ''}
                    ${this.images.length > 1 ? `<span class="color-text-muted text-xs">(${this.currentIndex + 1}/${this.images.length})</span>` : ''}
                </div>
            `;
        }

        if (this.images.length > 1) {
            captionHtml += `
                <div class="lightbox-strip">
                    ${this.images.map((img, idx) => `
                        <img class="lightbox-thumb ${idx === this.currentIndex ? 'active' : ''}" src="${img}" data-idx="${idx}" alt="Thumb ${idx + 1}">
                    `).join('')}
                </div>
            `;
        }

        // Check if navigation buttons exist in lightbox
        let prevBtn = this.lightboxEl.querySelector('.lightbox-prev');
        let nextBtn = this.lightboxEl.querySelector('.lightbox-next');

        if (this.images.length > 1) {
            if (!prevBtn) {
                prevBtn = document.createElement('button');
                prevBtn.className = 'lightbox-nav-btn lightbox-prev';
                prevBtn.innerHTML = '‹';
                prevBtn.title = 'Previous image';
                prevBtn.addEventListener('click', (e) => { e.stopPropagation(); this.prev(); });
                this.lightboxEl.appendChild(prevBtn);
            }
            if (!nextBtn) {
                nextBtn = document.createElement('button');
                nextBtn.className = 'lightbox-nav-btn lightbox-next';
                nextBtn.innerHTML = '›';
                nextBtn.title = 'Next image';
                nextBtn.addEventListener('click', (e) => { e.stopPropagation(); this.next(); });
                this.lightboxEl.appendChild(nextBtn);
            }
            prevBtn.style.display = 'flex';
            nextBtn.style.display = 'flex';
        } else {
            if (prevBtn) prevBtn.style.display = 'none';
            if (nextBtn) nextBtn.style.display = 'none';
        }

        if (captionHtml) {
            this.labelEl.innerHTML = captionHtml;
            this.labelEl.classList.remove('hidden');

            // Attach thumbnail click handlers
            this.labelEl.querySelectorAll('.lightbox-thumb').forEach(thumb => {
                thumb.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.currentIndex = parseInt(thumb.dataset.idx, 10);
                    this.renderImage();
                });
            });
        } else {
            this.labelEl.innerHTML = '';
            this.labelEl.classList.add('hidden');
        }
    }

    prev() {
        if (this.images.length <= 1) return;
        this.currentIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
        this.renderImage();
    }

    next() {
        if (this.images.length <= 1) return;
        this.currentIndex = (this.currentIndex + 1) % this.images.length;
        this.renderImage();
    }

    close() {
        if (!this.lightboxEl) return;
        this.lightboxEl.classList.add('hidden');
        this.imgEl.src = '';
        this.labelEl.innerHTML = '';
        this.images = [];
        document.body.classList.remove('modal-open');
    }
}

export const lightbox = new UniversalLightbox();
