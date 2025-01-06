import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';

interface Lote {
  id: number;
  name: string;
  cursos: number[];
  muestras: number[];
  cursos_details?: {
    id: number;
    asignatura: string;
    anio: number;
    grupo: string;
  }[];
  muestras_details?: {
    id: number;
    name: string;
  }[];
}

interface Muestra {
  id: number;
  name: string;
  Categoria: Array<{ id: number; name: string; }>;
  organo: Array<{ id: number; name: string; }>;
  tincion: Array<{ id: number; name: string; }>;
  imagenUrl: string | undefined;  // Changed from optional to union with undefined
  sistemas: Array<{ sistema: string; organo: string; display?: string; }>;
}

interface Sistema {
  id?: number;
  name?: string;
  sistema: string;
  organo: string;
  display?: string;
}

interface RawMuestra {
  id: number;
  name: string;
  sistemas?: Sistema[];
  capturas?: Array<{ image: string }>;
  organo?: any[];
  tincion?: any[];
}

@Component({
  selector: 'app-lotes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lotes.component.html',
  styleUrls: ['./lotes.component.css']
})
export class LotesComponent implements OnInit {
  lotes: Lote[] = [];
  newLote: Partial<Lote> = {};
  selectedLote: Lote | null = null;
  isEditing = false;
  isLoading = false;
  errorMessage = '';
  cursos: any[] = [];
  muestras: Muestra[] = [];
  selectedMuestras: number[] = [];
  selectedCursos: number[] = [];
  editSelectedMuestras: number[] = [];
  editSelectedCursos: number[] = [];
  categorias: any[] = [];
  organos: any[] = [];
  sistemas: any[] = [];
  tinciones: any[] = [];
  tags: any[] = [];
  
  filtrosMuestra = {
    categoria: '',
    organo: '',
    sistema: '',
    tincion: '',
    tag: '',
    searchText: ''
  };

  filtrosMuestraEdit = {
    categoria: '',
    organo: '',
    sistema: '',
    tincion: '',
    tag: '',
    searchText: ''
  };

  muestrasFiltradas: Muestra[] = [];
  muestrasFiltradas_edit: Muestra[] = []; // New array for edit mode

  showCreateForm = false;  // Add this property

  constructor(private api: ApiService, public auth: AuthService) {}

  ngOnInit(): void {
    this.loadLotes();
    this.loadCursos();
    this.loadMuestras();
    this.loadFilters();
  }

  loadLotes(): void {
    this.isLoading = true;
    // TODO: Implementar getLotes en ApiService
    this.api.getLotes().subscribe({
      next: (data) => {
        this.lotes = data;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Error al cargar los lotes';
        this.isLoading = false;
        console.error('Error:', error);
      }
    });
  }

  loadCursos(): void {
    this.api.getCursos().subscribe({
      next: (data) => this.cursos = data,
      error: (error) => console.error('Error al cargar cursos:', error)
    });
  }

  loadMuestras(): void {
    this.api.getMuestras().subscribe({
      next: (data: RawMuestra[]) => {
        this.muestras = data.map((m: RawMuestra) => {
          const firstCapture = m.capturas && m.capturas.length > 0 ? m.capturas[0].image : undefined;
          const sistemas = m.sistemas || [];
          
          return {
            id: m.id,
            name: m.name,
            Categoria: sistemas.map(s => ({
              id: s.sistema ? this.sistemas.find(sys => sys.name === s.sistema)?.id || 0 : 0,
              name: s.sistema || ''
            })),
            organo: m.organo || [],
            tincion: m.tincion || [],
            imagenUrl: firstCapture,
            sistemas: sistemas
          };
        });
        
        console.log('Raw data:', data);
        console.log('Processed muestras:', this.muestras);
        this.muestrasFiltradas = [...this.muestras];
      },
      error: (error) => console.error('Error al cargar muestras:', error)
    });
  }

  loadFilters(): void {
    this.api.getFilters().subscribe({
      next: (data) => {
        this.categorias = data.categorias;
        this.organos = data.organos;
        this.sistemas = data.sistemas;
        this.tinciones = data.tinciones;
        this.tags = data.tags;
      },
      error: (error) => console.error('Error cargando filtros:', error)
    });
  }

  aplicarFiltros(): void {
    console.log('Applying filters:', this.filtrosMuestra);
    console.log('Available sistemas:', this.sistemas);
    
    this.muestrasFiltradas = this.muestras.filter(muestra => {
      const matchesCategoria = !this.filtrosMuestra.categoria ||
        muestra.Categoria.some(cat => {
          console.log('Comparing categoria:', {
            categoryId: cat.id,
            selectedId: parseInt(this.filtrosMuestra.categoria, 10),
            matches: cat.id === parseInt(this.filtrosMuestra.categoria, 10)
          });
          return cat.id === parseInt(this.filtrosMuestra.categoria, 10);
        });

      // Match órgano by name from sistemas
      const matchesOrgano = !this.filtrosMuestra.organo ||
        muestra.sistemas.some(sis => {
          const selectedOrgano = this.organos.find(
            org => org.id === parseInt(this.filtrosMuestra.organo, 10)
          );
          return sis.organo === selectedOrgano?.name;
        });

      // Match sistema by name
      const matchesSistema = !this.filtrosMuestra.sistema ||
        muestra.sistemas.some(sis => {
          const selectedSistema = this.sistemas.find(
            s => s.id === parseInt(this.filtrosMuestra.sistema, 10)
          );
          return sis.sistema === selectedSistema?.name;
        });

      // Match tinción by ID
      const matchesTincion = !this.filtrosMuestra.tincion ||
        muestra.tincion.some(tin => {
          const selectedTincionId = parseInt(this.filtrosMuestra.tincion, 10);
          console.log('Comparing tincion:', {
            tincionId: tin.id,
            selectedTincionId,
            matches: tin.id === selectedTincionId
          });
          return tin.id === selectedTincionId;
        });

      // Match text search
      const matchesSearch = !this.filtrosMuestra.searchText ||
        muestra.name.toLowerCase().includes(this.filtrosMuestra.searchText.toLowerCase());

      const matches = matchesCategoria && matchesOrgano && matchesSistema && matchesTincion && matchesSearch;
      
      console.log('Matches for muestra:', muestra.name, {
        categoria: matchesCategoria,
        organo: matchesOrgano,
        sistema: matchesSistema,
        tincion: matchesTincion,
        search: matchesSearch,
        final: matches
      });

      return matches;
    });

    console.log('Filtered results:', this.muestrasFiltradas);
  }

  aplicarFiltrosEdit(): void {
    console.log('Applying filters for edit:', this.filtrosMuestraEdit);
    
    this.muestrasFiltradas_edit = this.muestras.filter(muestra => {
      const matchesCategoria = !this.filtrosMuestraEdit.categoria ||
        muestra.Categoria.some(cat => cat.id === parseInt(this.filtrosMuestraEdit.categoria, 10));

      const matchesOrgano = !this.filtrosMuestraEdit.organo ||
        muestra.sistemas.some(sis => {
          const selectedOrgano = this.organos.find(org => org.id === parseInt(this.filtrosMuestraEdit.organo, 10));
          return sis.organo === selectedOrgano?.name;
        });

      const matchesSistema = !this.filtrosMuestraEdit.sistema ||
        muestra.sistemas.some(sis => {
          const selectedSistema = this.sistemas.find(s => s.id === parseInt(this.filtrosMuestraEdit.sistema, 10));
          return sis.sistema === selectedSistema?.name;
        });

      const matchesTincion = !this.filtrosMuestraEdit.tincion ||
        muestra.tincion.some(tin => tin.id === parseInt(this.filtrosMuestraEdit.tincion, 10));

      const matchesSearch = !this.filtrosMuestraEdit.searchText ||
        muestra.name.toLowerCase().includes(this.filtrosMuestraEdit.searchText.toLowerCase());

      return matchesCategoria && matchesOrgano && matchesSistema && matchesTincion && matchesSearch;
    });

    console.log('Filtered results for edit:', this.muestrasFiltradas_edit);
  }

  resetFiltros(): void {
    this.filtrosMuestra = {
      categoria: '',
      organo: '',
      sistema: '',
      tincion: '',
      tag: '',
      searchText: ''
    };
    this.muestrasFiltradas = [...this.muestras];
  }

  resetFiltrosEdit(): void {
    this.filtrosMuestraEdit = {
      categoria: '',
      organo: '',
      sistema: '',
      tincion: '',
      tag: '',
      searchText: ''
    };
    this.muestrasFiltradas_edit = [...this.muestras];
  }

  saveLote(): void {
    if (!this.newLote.name) {
      this.errorMessage = 'Por favor ingrese un nombre para el lote';
      return;
    }

    this.isLoading = true;
    const loteData = {
      name: this.newLote.name,
      cursoIds: this.selectedCursos.filter(id => id !== null),  // Changed from cursos to cursoIds
      muestraIds: this.selectedMuestras.filter(id => id !== null)  // Changed from muestras to muestraIds
    };

    console.log('Creating lote with data:', loteData);  // Debug log

    this.api.createLote(loteData).subscribe({
      next: (response) => {
        console.log('Create response:', response);  // Debug log
        this.lotes.push(response);
        this.newLote = {};
        this.selectedCursos = [];
        this.selectedMuestras = [];
        this.loadLotes();  // Reload lotes to get fresh data
        this.showCreateForm = false;  // Hide the form after successful creation
        this.isLoading = false;
        this.errorMessage = '';
      },
      error: (error) => {
        this.errorMessage = 'Error al crear el lote';
        this.isLoading = false;
        console.error('Error:', error);
      }
    });
  }

  deleteLote(id: number): void {
    if (!confirm('¿Está seguro de eliminar este lote?')) return;

    // TODO: Implementar deleteLote en ApiService
    this.api.deleteLote(id).subscribe({
      next: () => {
        this.lotes = this.lotes.filter(lote => lote.id !== id);
      },
      error: (error) => {
        this.errorMessage = 'Error al eliminar el lote';
        console.error('Error:', error);
      }
    });
  }

  editLote(lote: Lote): void {
    this.selectedLote = { ...lote };
    this.isEditing = true;
    // Asegurarnos de que tenemos las muestras y cursos correctos
    this.editSelectedMuestras = lote.muestras_details?.map(m => m.id) || [];
    this.editSelectedCursos = lote.cursos_details?.map(c => c.id) || [];
    this.muestrasFiltradas_edit = [...this.muestras];
    
    console.log('Editing lote:', {
      lote,
      selectedMuestras: this.editSelectedMuestras,
      selectedCursos: this.editSelectedCursos
    });
  }

  updateLote(): void {
    if (!this.selectedLote) {
      this.errorMessage = 'No hay lote seleccionado para actualizar';
      return;
    }

    if (!this.selectedLote.name) {
      this.errorMessage = 'Por favor ingrese un nombre para el lote';
      return;
    }

    this.isLoading = true;
    const loteData = {
      name: this.selectedLote.name,
      cursoIds: this.editSelectedCursos,
      muestraIds: this.editSelectedMuestras
    };

    console.log('Updating lote with data:', loteData);

    this.api.updateLote(this.selectedLote.id, loteData).subscribe({
      next: (response) => {
        console.log('Update response:', response);
        const index = this.lotes.findIndex(l => l.id === this.selectedLote!.id);
        if (index !== -1) {
          this.lotes[index] = response;
        }
        this.loadLotes(); // Recargar los lotes para asegurar datos actualizados
        this.cancelEdit();
        this.isLoading = false;
        this.errorMessage = '';
      },
      error: (error) => {
        this.errorMessage = 'Error al actualizar el lote';
        this.isLoading = false;
        console.error('Error:', error);
      }
    });
  }

  cancelEdit(): void {
    this.selectedLote = null;
    this.isEditing = false;
    this.editSelectedMuestras = [];
    this.editSelectedCursos = [];
    this.muestrasFiltradas_edit = []; // Clear edit filtered list
  }

  toggleMuestra(muestraId: number): void {
    if (this.isEditing) {
      const index = this.editSelectedMuestras.indexOf(muestraId);
      if (index === -1) {
        this.editSelectedMuestras.push(muestraId);
      } else {
        this.editSelectedMuestras.splice(index, 1);
      }
    } else {
      const index = this.selectedMuestras.indexOf(muestraId);
      if (index === -1) {
        this.selectedMuestras.push(muestraId);
      } else {
        this.selectedMuestras.splice(index, 1);
      }
    }
  }

  toggleCurso(cursoId: number): void {
    if (this.isEditing) {
      const index = this.editSelectedCursos.indexOf(cursoId);
      if (index === -1) {
        this.editSelectedCursos.push(cursoId);
      } else {
        this.editSelectedCursos.splice(index, 1);
      }
    } else {
      const index = this.selectedCursos.indexOf(cursoId);
      if (index === -1) {
        this.selectedCursos.push(cursoId);
      } else {
        this.selectedCursos.splice(index, 1);
      }
    }
  }

  getCursoName(cursoId: number): string {
    const curso = this.cursos.find(c => c.id === cursoId);
    return curso ? `${curso.asignatura} - ${curso.anio} (${curso.grupo})` : 'N/A';
  }

  getMuestraName(muestraId: number): string {
    const muestra = this.muestras.find(m => m.id === muestraId);
    return muestra ? muestra.name : 'N/A';
  }

  toggleCreateForm(): void {
    this.showCreateForm = !this.showCreateForm;
  }
}
