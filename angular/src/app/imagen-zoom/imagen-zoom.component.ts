import { Component, Input, Output, EventEmitter, ChangeDetectorRef, ElementRef, ViewChild, OnInit, AfterViewInit, HostListener, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { Label, Tag } from '../services/tejidos.mock';  // Importar desde el mock
import { AuthService } from '../services/auth.service';  // Importar AuthService
import { switchMap } from 'rxjs/operators';  // Importar switchMap

@Component({
  selector: 'app-imagen-zoom',
  templateUrl: './imagen-zoom.component.html',
  styleUrls: ['./imagen-zoom.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule],
})
export class ImagenZoomComponent implements OnInit, AfterViewInit {
  @Input() imageUrl: string = '';
  @Input() centerImage: boolean = false;
  @Input() capturaId: number = 0;
  @Output() labelCreated = new EventEmitter<Label>();  // Emitir evento cuando se crea una etiqueta

  @Input() highlightedLabel: Label | null = null;  // Agregar este input

  @Input() set highlightedLabelId(id: number | null) {
    if (id !== null) {
      this.highlightLabel(id);
    } else {
      this.unhighlightAll();
    }
  }

  @Input() set initialLabels(labels: Label[]) {
    // Only show labels that are marked as visible
    this.labels = labels.filter(label => label.visible !== false);
    this.cdr.detectChanges();
  }

  @Input() set isTaggingMode(value: boolean) {
    this._isTaggingMode = value;
    if (!value) {
      // Limpiar etiquetas temporales y resaltados cuando se desactiva el modo
      this.labels = this.labels.filter(label => !label.isTemporary);
      this.clearHighlights();
    }
    this.cdr.detectChanges();
  }
  get isTaggingMode(): boolean {
    return this._isTaggingMode;
  }
  private _isTaggingMode = false;

  scale: number = 1;
  labels: Label[] = [];
  selectedTag: number | undefined = undefined;  // Cambiar el tipo y valor inicial
  labelNota: string = '';
  zoomlimittop: number = 3;
  zoomlimitdown: number = 0.3;
  offsetX: number = 0;
  offsetY: number = 0;
  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;

  showLabels: boolean = true;
  availableTags: Tag[] = [];  // Ahora tipado correctamente
  selectedLabel: Label | null = null;

  @ViewChild('imageContainer', { static: true }) imageContainer!: ElementRef;
  @ViewChild('imageElement', { static: true }) imageElement!: ElementRef<HTMLImageElement>;
  @ViewChild('container', { static: true }) container!: ElementRef;  // Add this line

  private previousImageUrl: string | undefined;

  constructor(
    private cdr: ChangeDetectorRef,
    private apiService: ApiService,
    private authService: AuthService  // Inyectar AuthService
  ) {}

  ngOnInit(): void {
    // Load tags first
    this.loadTagsAndLabels();
  }

  private loadTagsAndLabels(): void {
    // First load tags
    this.apiService.getTags().subscribe({
      next: (tags) => {
        console.log('Tags loaded:', tags);
        this.availableTags = tags;
        // After tags are loaded, load labels
        if (this.capturaId) {
          this.loadLabelsWithRetry();
        }
      },
      error: (error) => {
        console.error('Error loading tags:', error);
        // Even if tags fail, try to load labels
        if (this.capturaId) {
          this.loadLabelsWithRetry();
        }
      }
    });
  }

  private loadLabelsWithRetry(retryCount = 3): void {
    this.apiService.getLabels(this.capturaId!).subscribe({
      next: (labels) => {
        console.log('Labels loaded:', labels);
        if (labels) {
          this.labels = this.filterLabels(labels);
          this.cdr.detectChanges();
        }
      },
      error: (error) => {
        console.error('Error loading labels:', error);
        if (retryCount > 0) {
          console.log(`Retrying label load... (${retryCount} attempts remaining)`);
          setTimeout(() => this.loadLabelsWithRetry(retryCount - 1), 1000);
        }
      }
    });
  }

  private filterLabels(labels: Label[]): Label[] {
    if (!labels) return [];
    
    const user = this.authService.getUser();
    if (!user) return [];

    return labels.filter(label => {
      if (label.tag === null) {
        return true; // Include labels with null tags
      }
      return label.public || label.created_by === user.id;
    });
  }

  isTagPublic(tag: number | Tag | null): boolean {
    if (tag === null) return false; // Handle null tag
    if (this.isTagObject(tag)) {
      return tag.public;
    }
    // If we have a tag ID, find the corresponding tag object
    const tagObject = this.availableTags.find(t => t.id === tag);
    return tagObject ? tagObject.public : false;
  }

  private isTagObject(tag: number | Tag | null): tag is Tag {
    return typeof tag === 'object' && tag !== null && 'public' in tag;
  }

  ngAfterViewInit(): void {
    this.resetZoom();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Solo resetear el zoom si la URL de la imagen cambió
    if (changes['imageUrl'] && this.imageUrl !== this.previousImageUrl) {
      this.previousImageUrl = this.imageUrl;
      this.resetZoom();
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    this.resetZoom();
  }

  resetZoom(): void {
    if (!this.imageUrl) return;

    const containerRect = this.imageContainer.nativeElement.getBoundingClientRect();
    const image = new Image();
    image.src = this.imageUrl;

    image.onload = () => {
      const containerWidth = containerRect.width;
      const containerHeight = containerRect.height;
      const imageAspectRatio = image.width / image.height;
      const containerAspectRatio = containerWidth / containerHeight;

      if (imageAspectRatio > containerAspectRatio) {
        // Image is wider than container
        this.scale = containerWidth / image.width;
      } else {
        // Image is taller than container
        this.scale = containerHeight / image.height;
      }

      // Calculate the scaled dimensions
      const scaledWidth = image.width * this.scale;
      const scaledHeight = image.height * this.scale;

      // Center the image
      this.offsetX = (containerWidth - scaledWidth) / 2;
      this.offsetY = (containerHeight - scaledHeight) / 2;

      this.cdr.detectChanges();
    };
  }

  toggleTaggingMode(): void {
    this.isTaggingMode = !this.isTaggingMode;
  }

  toggleLabelsVisibility(): void {
    this.showLabels = !this.showLabels;
  }

  zoomIn(): void {
    if (this.scale < this.zoomlimittop) {
      const oldScale = this.scale;
      this.scale += 0.1;

      const rect = this.imageContainer.nativeElement.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const scaleRatio = this.scale / oldScale;

      this.offsetX = centerX - (centerX - this.offsetX) * scaleRatio;
      this.offsetY = centerY - (centerY - this.offsetY) * scaleRatio;

      this.cdr.detectChanges();
    }
  }

  zoomOut(): void {
    if (this.scale > this.zoomlimitdown) {
      const oldScale = this.scale;
      this.scale -= 0.1;

      const rect = this.imageContainer.nativeElement.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const scaleRatio = this.scale / oldScale;

      this.offsetX = centerX - (centerX - this.offsetX) * scaleRatio;
      this.offsetY = centerY - (centerY - this.offsetY) * scaleRatio;

      this.cdr.detectChanges();
    }
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();

    const zoomIntensity = 0.1;
    const oldScale = this.scale;

    if (event.deltaY < 0 && this.scale < this.zoomlimittop) {
      this.scale += zoomIntensity;
    } else if (event.deltaY > 0 && this.scale > this.zoomlimitdown) {
      this.scale -= zoomIntensity;
    }

    const scaleRatio = this.scale / oldScale;

    const rect = this.imageContainer.nativeElement.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    this.offsetX = mouseX - (mouseX - this.offsetX) * scaleRatio;
    this.offsetY = mouseY - (mouseY - this.offsetY) * scaleRatio;

    this.cdr.detectChanges();
  }

  onMouseDown(event: MouseEvent): void {
    event.preventDefault();
    this.isDragging = true;
    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;
  }

  onMouseMove(event: MouseEvent): void {
    if (this.isDragging) {
      event.preventDefault();
      const deltaX = event.clientX - this.lastMouseX;
      const deltaY = event.clientY - this.lastMouseY;

      this.offsetX += deltaX; // Cambiado a += para corregir el sentido
      this.offsetY += deltaY; // Cambiado a += para corregir el sentido

      this.lastMouseX = event.clientX;
      this.lastMouseY = event.clientY;

      this.cdr.detectChanges();
    }
  }

  onMouseUp(): void {
    this.isDragging = false;
  }

  onImageClick(event: MouseEvent): void {
    if (!this.isTaggingMode || !this.capturaId || !this.selectedTag === undefined) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const rect = this.imageContainer.nativeElement.getBoundingClientRect();
    const x = (event.clientX - rect.left - this.offsetX) / this.scale;
    const y = (event.clientY - rect.top - this.offsetY) / this.scale;

    // Remove any temporary labels first
    this.labels = this.labels.filter(label => !label.isTemporary);

    const newLabel: Partial<Label> = {
      nota: 'Nueva etiqueta',
      tag: this.selectedTag!,
      coordenadas: { x, y },
      captura: this.capturaId,
      visible: true
    };

    this.apiService.createLabel(newLabel).subscribe(
      (createdLabel: Label) => {
        this.labels.push({
          ...createdLabel,
          visible: true,
          highlighted: false
        });
        this.labelCreated.emit(createdLabel);
        this.cdr.detectChanges();
      },
      error => console.error('Error creating label:', error)
    );
  }

  deleteLabel(labelId: number): void {
    if (!confirm('¿Estás seguro de que deseas eliminar esta etiqueta?')) {
      return;
    }

    this.apiService.deleteLabel(labelId).subscribe(
      () => {
        this.labels = this.labels.filter(label => label.id !== labelId);
        this.cdr.detectChanges();
      },
      error => console.error('Error deleting label:', error)
    );
  }

  handleClick(event: MouseEvent): void {
    if (!this.isTaggingMode) return;

    const rect = this.imageContainer.nativeElement.getBoundingClientRect();
    const x = (event.clientX - rect.left) / this.scale;
    const y = (event.clientY - rect.top) / this.scale;

    this.addTemporaryLabel(x, y);
  }

  resetLabels(): void {
    this.labels = [];
    this.cdr.detectChanges();
  }

  createLabel(): void {
    console.log('Intentando crear label con:', {
      isTaggingMode: this.isTaggingMode,
      selectedTag: this.selectedTag,
      capturaId: this.capturaId,
      labelNota: this.labelNota
    });
    if (!this.isTaggingMode || this.selectedTag === undefined || !this.capturaId) {
      console.warn('Missing required data for creating label:', {
        isTaggingMode: this.isTaggingMode,
        selectedTag: this.selectedTag,
        capturaId: this.capturaId
      });
      return;
    }

    const rect = this.imageContainer.nativeElement.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const newLabel: Partial<Label> = {
      nota: this.labelNota,
      tag: this.selectedTag!, // Usar solo el ID del tag
      coordenadas: { 
        x: (centerX + this.offsetX) / this.scale,
        y: (centerY + this.offsetY) / this.scale
      },
      captura: this.capturaId
    };

    this.authService.refreshToken().pipe(
      switchMap(() => this.apiService.createLabel(newLabel))
    ).subscribe(
      (createdLabel: Label) => {
        this.labels.push(createdLabel);
        this.labelNota = ''; // Reset nota
        this.selectedTag = undefined; // Cambiar null por undefined
        this.cdr.detectChanges();
      },
      error => console.error('Error creating label:', error)
    );
  }

  onTagSelected(value: string): void {
    const numValue = parseInt(value, 10);
    console.log('Tag seleccionado (string):', value);
    console.log('Tag seleccionado (number):', numValue);
    if (!isNaN(numValue)) {
      this.selectedTag = numValue;
    } else {
      this.selectedTag = undefined;
    }
    console.log('selectedTag actualizado:', this.selectedTag);
    this.cdr.detectChanges();
  }

  highlightLabel(labelId: number): void {
    // Solo actualizar la propiedad highlighted sin recrear el arreglo ni modificar la posición
    this.labels.forEach(label => {
      label.highlighted = label.id === labelId;
    });
    // No llamar a detectChanges() para toda la vista, solo actualizar las etiquetas
    this.cdr.markForCheck();
  }

  unhighlightAll(): void {
    // Solo actualizar la propiedad highlighted sin recrear el arreglo ni modificar la posición
    this.labels.forEach(label => {
      label.highlighted = false;
    });
    // No llamar a detectChanges() para toda la vista, solo actualizar las etiquetas
    this.cdr.markForCheck();
  }

  getLabelTagName(label: Label): string {
    if (this.isTagObject(label.tag)) {
      return label.tag.name;
    }
    const tagObject = this.availableTags.find(t => t.id === label.tag);
    return tagObject ? tagObject.name : 'Sin etiquetar'; // Cambiar el texto aquí
  }

  private addTemporaryLabel(x: number, y: number): void {
    const temporaryLabel: Label = {
      nota: '',
      tag: null,
      coordenadas: { x, y },
      captura: this.capturaId,
      isTemporary: true,
      visible: true,
      public: false
    };
    this.labels.push(temporaryLabel);
    this.cdr.detectChanges();
  }

  clearHighlights(): void {
    this.labels = this.labels.map(label => ({
      ...label,
      highlighted: false
    }));
    this.cdr.detectChanges();
  }
}
