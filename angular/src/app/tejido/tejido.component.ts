import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { NgFor, CommonModule } from '@angular/common'; // Import CommonModule
import { FormsModule } from '@angular/forms'; // Import FormsModule
import { ApiService } from '../services/api.service';
import { Tejido, Label, Tag, Profesor, Alumno, Sistema } from '../services/tejidos.mock';  // Remove Muestra from import and add Sistema
import { ActivatedRoute } from '@angular/router';
import { NgxImageZoomModule } from 'ngx-image-zoom';
import { ImagenZoomComponent } from '../imagen-zoom/imagen-zoom.component';
import { AuthService } from '../services/auth.service';
import { SharedModule } from '../shared/shared.module'; // Import SharedModule
import { UpdateMuestraRequest, UpdateMuestraResponse } from '../services/api.service'; // Add these imports

// Update interfaces for better type safety
interface BaseNota {
  titulo: string;
  cuerpo: string;
  alumno?: number;
  profesor?: number;
  muestra?: number;
  public: boolean;
}

interface Nota extends BaseNota {
  id?: number;
}

interface NotaResponse extends BaseNota {
  id: number;
}

interface Captura {
  id: number;
  name: string;
  image: string;
}

interface LocalMuestra {  // Renamed from Muestra to avoid conflict
  id: number;
  name: string;
  capturas: Captura[];
  notas: NotaResponse[];  // Update this to use NotaResponse
  sistemas: Sistema[];  // Now properly typed
  public: boolean;  // Add this property
  Categoria: any[];  // Add this property
  organo: any[];  // Add this property
  tincion: any[];  // Add this property
}

@Component({
  selector: 'app-tejido',
  standalone: true,
  imports: [NgFor, CommonModule, FormsModule, NgxImageZoomModule, ImagenZoomComponent, SharedModule], // Add SharedModule to imports
  templateUrl: './tejido.component.html',
  styleUrls: ['./tejido.component.css']
})
export class TejidoComponent implements OnInit {
  tejidosArray: LocalMuestra[] = [];  // Updated type
  imagenSeleccionada: Captura | null = null;  // Cambiar el tipo aquí
  initialLabels: Label[] = [];  // Cambiar el tipo aquí
  isSidebarCollapsed = false;
  newNota: Nota = { 
    titulo: '', 
    cuerpo: '', 
    public: false,
    muestra: undefined
  };
  selectedNota: Nota | null = null; // Add selectedNota to track the selected note
  isEditingNota = false;
  isLoading = false;
  errorMessage = '';
  selectedSection: 'info' | 'labels' | 'notes' = 'info';
  currentLabels: Label[] = [];
  highlightedLabel: Label | null = null;
  isTaggingMode: boolean = false;
  availableTags: Tag[] = [];
  editingLabel: Label | null = null;  // Para editar etiquetas
  editingLabelId: number | null = null;
  newLabel: Partial<Label> = { public: false }; // Add public field
  highlightedLabelId: number | null = null;
  groupedLabels: { [key: string]: { 
    labels: Label[], 
    isCollapsed: boolean,
    isVisible: boolean 
  } } = {};
  objectKeys = Object.keys;
  profesores: Profesor[] = []; 
  alumnos: Alumno[] = [];
  isEditingMuestra = false;
  editingMuestra: any = null;

  constructor(private route: ActivatedRoute, private api: ApiService, public auth: AuthService, private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.getTejido(parseInt(id, 10));
      }
    });
    this.loadTags(); // Ensure tags are loaded on initialization
    this.loadUsers(); // Añadir esta llamada
  }

  getTejido(id: number): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.api.getTejido(id).subscribe({
      next: (tejido: Tejido) => {
        const muestra: LocalMuestra = {
          id: tejido.id,
          name: tejido.name,
          capturas: tejido.capturas,
          notas: this.filterNotas(tejido.notas).map(nota => ({
            ...nota,
            public: nota.public || false
          })),
          sistemas: tejido.sistemas,  // No need to map, using the Sistema interface
          public: tejido.public || false,
          Categoria: tejido.Categoria || [],
          organo: tejido.organo || [],
          tincion: tejido.tincion || []
        };
        this.tejidosArray = [muestra];  // Replace instead of push
        if (muestra.capturas && muestra.capturas.length > 0) {
          this.imagenSeleccionada = muestra.capturas[0];  // Asignar la captura completa
          this.loadLabels();  // Cargar etiquetas para la captura seleccionada
        } else {
          console.warn('No se encontraron capturas en el tejido.');
        }
        this.isLoading = false;
      },
      error: (err: any) => {
        this.isLoading = false;
        if (err.status === 403 && err.error.code === 'token_not_valid') {
          this.auth.refreshToken().subscribe({
            next: (response: any) => {
              this.auth.setToken(response.access);
              this.getTejido(id);
            },
            error: refreshErr => {
              console.error('Error al refrescar el token:', refreshErr);
              this.auth.logout();
            }
          });
        } else if (err.status === 404) {
          this.errorMessage = 'Tejido no encontrado.';
          console.error('Tejido no encontrado:', err);
        } else {
          this.errorMessage = 'Error al obtener el tejido.';
          console.error('Error al obtener el tejido:', err);
        }
      }
    });
  }

  filterNotas(notas: any[]): NotaResponse[] {
    const user = this.auth.getUser();
    if (!user) return [];

    return notas.filter(nota => 
      nota.public || 
      nota.alumno === user.id || 
      nota.profesor === user.id
    ).map(nota => ({
      ...nota,
      id: nota.id,
      public: nota.public || false
    }));
  }

  seleccionarImagen(captura: Captura): void {
    console.log('Captura seleccionada:', captura);  // Para debugging
    this.imagenSeleccionada = captura;
    this.loadLabels();  // Cargar etiquetas para la captura seleccionada
  }

  selectCategory(category: string) {
    console.log('Categoría seleccionada:', category);
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  startAddNota(): void {
    this.selectedNota = null;
    this.isEditingNota = true;
    this.newNota = { 
      titulo: '', 
      cuerpo: '', 
      public: false,
      muestra: this.tejidosArray[0]?.id
    };
  }

  editNota(nota: Nota): void {
    const user = this.auth.getUser();
    if (!user) {
      console.error('No se encontró el usuario.');
      return;
    }

    this.selectedNota = nota;
    this.isEditingNota = user.is_profesor && nota.profesor === user.id && nota.public;
  }

  saveNota(): void {
    const user = this.auth.getUser();
    if (!user) {
      console.error('No se encontró el usuario.');
      return;
    }

    if (user.is_alumno) {
      this.newNota.alumno = user.id;
      this.newNota.public = false; // Ensure notes created by students are private
    } else if (user.is_profesor) {
      this.newNota.profesor = user.id;
    } else {
      console.error('El usuario debe ser un alumno o un profesor.');
      return;
    }

    const notaData = {
      nota: {  // Wrap the data in a 'nota' object as expected by the API
        titulo: this.newNota.titulo,
        cuerpo: this.newNota.cuerpo,
        alumno: this.newNota.alumno,
        profesor: this.newNota.profesor,
        muestra: this.tejidosArray[0]?.id, // Asegúrate de que la nota pertenezca a una muestra
        public: this.newNota.public // Add public field
      }
    };
    console.log('Request data:', notaData); // Log the request data

    if (this.newNota.id) {
      this.api.updateNota(this.newNota.id, notaData).subscribe({
        next: (response: any) => {
          console.log('Nota actualizada exitosamente:', response);
          const index = this.tejidosArray[0].notas.findIndex(n => n.id === this.newNota.id);
          if (index !== -1) {
            this.tejidosArray[0].notas[index] = response;
          }
          this.newNota = { titulo: '', cuerpo: '', public: false }; // Reset public field
          this.isEditingNota = false;
          this.selectedNota = null;
          if (this.selectedNota) {
            this.isEditingNota = false;  // Volver al modo visualización
            this.selectedNota = { ...this.newNota };  // Actualizar la nota seleccionada
          } else {
            this.closeNota();  // Cerrar el editor si era una nota nueva
          }
        },
        error: (err: any) => {
          console.error('Error al actualizar la nota:', err);
        }
      });
    } else {
      this.api.addNota(notaData, {}).subscribe({
        next: (response: any) => {
          console.log('Nota agregada exitosamente:', response);
          this.tejidosArray[0].notas.push(response);
          this.newNota = { titulo: '', cuerpo: '', public: false }; // Reset public field
          this.isEditingNota = false;
          this.selectedNota = null;
          if (this.selectedNota) {
            this.isEditingNota = false;  // Volver al modo visualización
            this.selectedNota = { ...this.newNota };  // Actualizar la nota seleccionada
          } else {
            this.closeNota();  // Cerrar el editor si era una nota nueva
          }
        },
        error: (err: any) => {
          console.error('Error al agregar la nota:', err);
          if (err.status === 403) {
            console.error('Error 403: Forbidden. Verifica los permisos y la autenticación.');
          }
        }
      });
    }
  }

  selectSection(section: 'info' | 'labels' | 'notes'): void {
    this.selectedSection = section;
    if (section === 'labels') {
      this.loadLabels();
    }
  }

  loadLabels(): void {
    if (this.imagenSeleccionada?.id) {
      this.api.getLabels(this.imagenSeleccionada.id).subscribe(
        labels => {
          this.currentLabels = this.filterLabels(labels).map(label => ({
            ...label,
            visible: true
          }));
          this.initialLabels = this.currentLabels;
          this.updateGroupedLabels();
          this.updateVisibleLabels();
        },
        error => console.error('Error loading labels:', error)
      );
    }
  }

  toggleLabelVisibility(label: Label): void {
    label.visible = !label.visible;
    this.updateVisibleLabels();
  }

  private updateVisibleLabels(): void {
    this.initialLabels = this.currentLabels.filter(label => {
      const tagName = this.getLabelTagName(label);
      const group = this.groupedLabels[tagName];
      return group?.isVisible && label.visible !== false;
    });
  }

  filterLabels(labels: Label[]): Label[] {
    const user = this.auth.getUser();
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

  getLabelTagName(label: Label): string {
    if (label.tag === null) return 'Sin etiquetar'; // Cambiar el texto
    if (this.isTagObject(label.tag)) {
      return label.tag.name;
    }
    const tagObject = this.availableTags.find(t => t.id === label.tag);
    return tagObject ? tagObject.name : 'Sin etiquetar'; // Cambiar el texto aquí también
  }

  highlightLabel(label: Label): void {
    this.highlightedLabelId = label.id || null;
  }

  unhighlightLabel(): void {
    this.highlightedLabelId = null;
  }

  editLabel(label: Label): void {
    console.log('Editando etiqueta:', label);
  }

  toggleTaggingMode(): void {
    this.isTaggingMode = !this.isTaggingMode;
    if (!this.isTaggingMode) {
      // Al desactivar el modo etiquetado, limpiar todos los resaltados
      this.highlightedLabelId = null;
      this.currentLabels = this.currentLabels.map(label => ({
        ...label,
        highlighted: false
      }));
    }
    if (this.isTaggingMode) {
      this.loadTags();
    }
  }

  loadTags(): void {
    this.api.getTags().subscribe(
      tags => {
        this.availableTags = tags;
        console.log('Tags cargados:', this.availableTags); // Debug
      },
      error => console.error('Error loading tags:', error)
    );
  }

  onLabelCreated(label: Label) {
    // Ensure the label has the correct visibility and tag information
    const newLabel = {
      ...label,
      visible: true,
      tag: this.availableTags.find(t => t.id === label.tag) || label.tag
    };

    // Add to currentLabels
    this.currentLabels = [...this.currentLabels, newLabel];

    // Update initialLabels for the image-zoom component
    this.initialLabels = [...this.currentLabels];

    // Update grouped labels
    this.updateGroupedLabels();

    // Start editing the new label
    this.editingLabelId = label.id || null;
    this.newLabel = { ...label };
    this.selectedSection = 'labels';

    // Load tags if not already loaded
    if (!this.availableTags.length) {
      this.loadTags();
    }

    // Ensure changes are detected
    this.cdr.detectChanges();
  }

  startEditingLabel(label: Label) {
    if (!label.is_owner) return;
    
    // Ensure tags are loaded before setting up editing state
    if (!this.availableTags.length) {
      this.loadTags();
    }

    this.editingLabelId = label.id || null;
    this.newLabel = {
      ...label,
      // Safely handle tag access
      tag: label.tag ? 
        (typeof label.tag === 'object' ? label.tag?.id : label.tag) 
        : null,
      public: label.public || false,
      nota: label.nota || '',
      coordenadas: label.coordenadas
    };
    console.log('Started editing label:', this.newLabel);
  }

  saveLabel() {
    const user = this.auth.getUser();
    if (!this.editingLabelId) {
      console.warn('Missing required data for label update');
      return;
    }

    const isPublic = user.is_alumno ? false : !!this.newLabel.public;

    // Ensure tag is properly handled
    const updateData: Partial<Label> = {
      nota: this.newLabel.nota || '',
      public: isPublic,
      coordenadas: this.newLabel.coordenadas,
      tag: this.newLabel.tag !== undefined && this.newLabel.tag !== null ? 
           Number(this.newLabel.tag) : 
           null
    };

    console.log('Sending update data:', updateData); // Debug log

    this.api.updateLabel(this.editingLabelId, updateData).subscribe({
      next: (updatedLabel) => {
        console.log('Successfully updated label:', updatedLabel);
        // Actualizar la etiqueta en la lista
        this.currentLabels = this.currentLabels.map(label => {
          if (label.id === this.editingLabelId) {
            return {
              ...label,
              ...updatedLabel,
              visible: true,
              is_owner: true,
              public: updatedLabel.public,
              // Actualizar el tag con los detalles completos
              tag: this.availableTags.find(t => t.id === updatedLabel.tag) || updatedLabel.tag
            };
          }
          return label;
        });

        // Actualizar grupos y etiquetas visibles
        this.editingLabelId = null;
        this.newLabel = { public: false };
        this.updateGroupedLabels();
        this.updateVisibleLabels();
        this.errorMessage = '';
      },
      error: (error) => {
        console.error('Error updating label:', error);
        this.errorMessage = error.error?.detail || error.error || 'Error al actualizar la etiqueta';
      }
    });
  }

  cancelEditing() {
    this.editingLabelId = null;
    this.newLabel = {};
    this.selectedNota = null; // Reset selectedNota
  }

  selectNota(nota: Nota | NotaResponse): void {
    // Ensure we have all required properties
    const processedNota: Nota = {
      id: nota.id,
      titulo: nota.titulo,
      cuerpo: nota.cuerpo,
      alumno: nota.alumno,
      profesor: nota.profesor,
      muestra: nota.muestra,
      public: nota.public ?? false
    };
    
    this.selectedNota = processedNota;
    this.newNota = { ...processedNota };
    this.isEditingNota = false;
  }

  closeNota(): void {
    this.selectedNota = null;
    this.newNota = { 
      titulo: '', 
      cuerpo: '', 
      public: false,
      muestra: undefined
    };
    this.isEditingNota = false;
  }

  startEditNota(): void {
    if (this.selectedNota) {
      this.isEditingNota = true;
      // Ensure all required properties are copied
      this.newNota = { 
        ...this.selectedNota,
        public: this.selectedNota.public ?? false
      };
    }
  }

  cancelEdit(): void {
    if (this.selectedNota?.id) {
      // Si estábamos editando una nota existente, volver al modo visualización
      this.isEditingNota = false;
    } else {
      // Si estábamos creando una nota nueva, cerrar el editor
      this.closeNota();
    }
  }

  isNotaOwner(nota: Nota): boolean {
    const user = this.auth.getUser();
    if (!user) return false;
    
    return (user.is_profesor && nota.profesor === user.id) || 
           (user.is_alumno && nota.alumno === user.id);
  }

  deleteNota(): void {
    if (!this.selectedNota || !this.selectedNota.id) return;

    if (confirm('¿Estás seguro de que deseas eliminar esta nota?')) {
      this.api.deleteNota(this.selectedNota.id).subscribe({
        next: () => {
          if (this.tejidosArray[0]) {
            this.tejidosArray[0].notas = this.tejidosArray[0].notas.filter(
              n => n.id !== this.selectedNota?.id
            );
          }
          this.closeNota();
        },
        error: (err) => {
          console.error('Error al eliminar la nota:', err);
          this.errorMessage = 'Error al eliminar la nota';
        }
      });
    }
  }

  // Add new getters for filtered notes
  get publicNotas(): NotaResponse[] {
    return this.tejidosArray[0]?.notas.filter(nota => nota.public) || [];
  }

  get privateNotas(): NotaResponse[] {
    const user = this.auth.getUser();
    if (!user) return [];
    
    return this.tejidosArray[0]?.notas.filter(nota => 
      !nota.public && (
        (user.is_alumno && nota.alumno === user.id) || 
        (user.is_profesor && nota.profesor === user.id)
      )
    ) || [];
  }

  private updateGroupedLabels(): void {
    const newGroups: { [key: string]: { labels: Label[], isCollapsed: boolean, isVisible: boolean } } = {};
    const sinEtiquetarKey = 'Sin etiquetar';
    let sinEtiquetarGroup: { labels: Label[], isCollapsed: boolean, isVisible: boolean } | undefined;
    
    // Procesar primero todas las etiquetas que no son "Sin etiquetar"
    this.currentLabels.forEach(label => {
      const tagName = this.getLabelTagName(label);
      if (tagName === sinEtiquetarKey) {
        // Guardar el grupo "Sin etiquetar" para después
        if (!sinEtiquetarGroup) {
          const previousState = this.groupedLabels[tagName] || { isCollapsed: false, isVisible: true };
          sinEtiquetarGroup = {
            labels: [],
            isCollapsed: previousState.isCollapsed,
            isVisible: previousState.isVisible
          };
        }
        sinEtiquetarGroup.labels.push(label);
      } else {
        // Procesar las etiquetas normales
        if (!newGroups[tagName]) {
          const previousState = this.groupedLabels[tagName] || { isCollapsed: false, isVisible: true };
          newGroups[tagName] = {
            labels: [],
            isCollapsed: previousState.isCollapsed,
            isVisible: previousState.isVisible
          };
        }
        newGroups[tagName].labels.push(label);
      }
    });

    // Agregar el grupo "Sin etiquetar" al final si existe
    if (sinEtiquetarGroup && sinEtiquetarGroup.labels.length > 0) {
      newGroups[sinEtiquetarKey] = sinEtiquetarGroup;
    }

    this.groupedLabels = newGroups;
    this.updateVisibleLabels();
  }

  toggleGroupVisibility(tagName: string): void {
    if (this.groupedLabels[tagName]) {
      this.groupedLabels[tagName].isVisible = !this.groupedLabels[tagName].isVisible;
      this.updateVisibleLabels();
    }
  }

  toggleGroupCollapse(tagName: string): void {
    if (this.groupedLabels[tagName]) {
      this.groupedLabels[tagName].isCollapsed = !this.groupedLabels[tagName].isCollapsed;
    }
  }

  canDeleteLabel(label: Label): boolean {
    const user = this.auth.getUser();
    if (!user) return false;
    return label.created_by === user.id;
  }

  deleteLabel(label: Label): void {
    if (!label.id || !this.canDeleteLabel(label)) return;

    if (confirm('¿Estás seguro de que deseas eliminar esta etiqueta?')) {
      this.api.deleteLabel(label.id).subscribe({
        next: () => {
          this.currentLabels = this.currentLabels.filter(l => l.id !== label.id);
          this.updateGroupedLabels();
          this.updateVisibleLabels();
        },
        error: (error) => console.error('Error al eliminar la etiqueta:', error)
      });
    }
  }

  getNotaAuthor(nota: NotaResponse): string {
    if (nota.profesor) {
      return 'Prof. ' + this.profesores.find(p => p.id === nota.profesor)?.nombre || 'Desconocido';
    } else if (nota.alumno) {
      return this.alumnos.find(a => a.id === nota.alumno)?.nombre || 'Desconocido';
    }
    return 'Desconocido';
  }

  loadUsers(): void {
    this.api.getProfesores().subscribe(
      (profesores: Profesor[]) => this.profesores = profesores,
      (error: any) => console.error('Error cargando profesores:', error)
    );
    this.api.getAlumnos().subscribe(
      (alumnos: Alumno[]) => this.alumnos = alumnos,
      (error: any) => console.error('Error cargando alumnos:', error)
    );
  }

  startEditingMuestra(): void {
    if (!this.tejidosArray[0] || !this.auth.getUser()?.is_profesor) return;
    
    this.editingMuestra = {
      name: this.tejidosArray[0].name,
      public: this.tejidosArray[0].public,
      Categoria: this.tejidosArray[0].Categoria,
      organo: this.tejidosArray[0].organo,
      tincion: this.tejidosArray[0].tincion
    };
    this.isEditingMuestra = true;
  }

  saveMuestraChanges(): void {
    if (!this.tejidosArray[0] || !this.editingMuestra) return;

    const updateData: UpdateMuestraRequest = {
      name: this.editingMuestra.name,
      public: this.editingMuestra.public,
      Categoria: this.editingMuestra.Categoria,
      organo: this.editingMuestra.organo,
      tincion: this.editingMuestra.tincion
    };

    this.api.updateMuestra(this.tejidosArray[0].id, updateData).subscribe({
      next: (updatedMuestra: UpdateMuestraResponse) => {
        this.tejidosArray[0] = {
          ...this.tejidosArray[0],
          ...updatedMuestra
        };
        this.isEditingMuestra = false;
        this.editingMuestra = null;
      },
      error: (error: Error) => {
        console.error('Error updating muestra:', error);
        this.errorMessage = 'Error al actualizar la muestra';
      }
    });
  }

  cancelMuestraEdit(): void {
    this.isEditingMuestra = false;
    this.editingMuestra = null;
  }
}

