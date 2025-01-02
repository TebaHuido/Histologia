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
  muestras: any[] = [];
  selectedMuestras: number[] = [];
  selectedCursos: number[] = [];
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

  muestrasFiltradas: any[] = [];

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
    // TODO: Implementar getMuestras en ApiService
    this.api.getMuestras().subscribe({
      next: (data) => this.muestras = data,
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
    this.muestrasFiltradas = this.muestras.filter(muestra => {
      const matchesCategoria = !this.filtrosMuestra.categoria || 
        muestra.Categoria.some((cat: any) => cat.id === this.filtrosMuestra.categoria);
      const matchesOrgano = !this.filtrosMuestra.organo || 
        muestra.organo.some((org: any) => org.id === this.filtrosMuestra.organo);
      const matchesSistema = !this.filtrosMuestra.sistema || 
        muestra.organo.some((org: any) => org.sistema.some((sis: any) => sis.id === this.filtrosMuestra.sistema));
      const matchesTincion = !this.filtrosMuestra.tincion || 
        muestra.tincion.some((tin: any) => tin.id === this.filtrosMuestra.tincion);
      const matchesSearch = !this.filtrosMuestra.searchText || 
        muestra.name.toLowerCase().includes(this.filtrosMuestra.searchText.toLowerCase());

      return matchesCategoria && matchesOrgano && matchesSistema && matchesTincion && matchesSearch;
    });
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

  saveLote(): void {
    if (!this.newLote.name) {
      this.errorMessage = 'Por favor ingrese un nombre para el lote';
      return;
    }

    this.isLoading = true;
    const loteData = {
      name: this.newLote.name,
      cursos: this.selectedCursos || [],
      muestras: this.selectedMuestras || []
    };

    this.api.createLote(loteData).subscribe({
      next: (response) => {
        this.lotes.push(response);
        this.newLote = {};
        this.selectedCursos = [];
        this.selectedMuestras = [];
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
    this.selectedMuestras = lote.muestras || [];
    this.selectedCursos = lote.cursos || [];
  }

  updateLote(): void {
    if (!this.selectedLote) return;

    if (!this.selectedLote.name) {
      this.errorMessage = 'Por favor ingrese un nombre para el lote';
      return;
    }

    this.isLoading = true;
    const loteData = {
      name: this.selectedLote.name,
      cursos: this.selectedCursos || [],
      muestras: this.selectedMuestras || []
    };

    this.api.updateLote(this.selectedLote.id, loteData).subscribe({
      next: (response) => {
        const index = this.lotes.findIndex(l => l.id === this.selectedLote!.id);
        if (index !== -1) {
          this.lotes[index] = response;
        }
        this.cancelEdit();
        this.isLoading = false;
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
    this.selectedMuestras = [];
    this.selectedCursos = [];
  }

  toggleMuestra(muestraId: number): void {
    if (!this.selectedLote) return;

    const index = this.selectedMuestras.indexOf(muestraId);
    if (index === -1) {
      // Añadir muestra al lote
      this.api.addMuestraToLote(this.selectedLote.id, muestraId).subscribe({
        next: () => {
          this.selectedMuestras.push(muestraId);
        },
        error: (error) => {
          console.error('Error al añadir muestra:', error);
        }
      });
    } else {
      // Remover muestra del lote
      this.api.removeMuestraFromLote(this.selectedLote.id, muestraId).subscribe({
        next: () => {
          this.selectedMuestras.splice(index, 1);
        },
        error: (error) => {
          console.error('Error al remover muestra:', error);
        }
      });
    }
  }

  toggleCurso(cursoId: number): void {
    if (!this.selectedLote) return;

    const index = this.selectedCursos.indexOf(cursoId);
    if (index === -1) {
      this.selectedCursos.push(cursoId);
    } else {
      this.selectedCursos.splice(index, 1);
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
}
