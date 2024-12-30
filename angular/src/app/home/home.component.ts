import { Component, OnInit } from '@angular/core';
import { ApiService } from '../services/api.service';
import { Tejido, Categorias } from '../services/tejidos.mock';
import { NgFor, CommonModule } from '@angular/common';
import { FilterComponent } from '../filter/filter.component';
import { AuthService } from '../services/auth.service';

interface Item {
  nombre: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [NgFor, CommonModule, FilterComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  listaTejidos_all: Tejido[] = [];
  listaTejidos_show: Tejido[] = [];
  listaCategorias: Categorias[] = [];
  sistemasUnicos: string[] = [];
  filteredTagsItems: { nombre: string }[] = [];
  filteredTejidosItems: { nombre: string }[] = [];
  sistemasUnicosFormateados: { nombre: string }[] = [];

  categorias: Item[] = [];
  organos: Item[] = [];
  sistemas: Item[] = [];
  tinciones: Item[] = [];
  tags: Item[] = [];

  selectedFilters: { [key: string]: string[] } = {
    category: [],
    organ: [],
    system: [],
    tincion: [],
    tag: []
  };

  constructor(private api: ApiService, private authService: AuthService) {}

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {

    this.api.getTejidos('all',).subscribe({
      next: (tejidos: Tejido[]) => {
        this.listaTejidos_all = tejidos;
        this.listaTejidos_show = tejidos;
        this.filteredTejidosItems = tejidos.map(te => ({ nombre: te.name }));
        this.obtenerSistemasUnicos();
      },
      error: err => {
        if (err.status === 403 && err.error.code === 'token_not_valid') {
          this.authService.refreshToken().subscribe({
            next: (response: any) => {
              this.authService.setToken(response.access);
              this.loadData();
            },
            error: refreshErr => {
              console.error('Error al refrescar el token:', refreshErr);
              this.authService.logout();
            }
          });
        } else {
          console.error('Error al obtener todos los tejidos:', err);
        }
      }
    });

    this.api.getFilters().subscribe({
      next: (data) => {
        this.categorias = this.transformDataToItems(data.categorias);
        this.organos = this.transformDataToItems(data.organos);
        this.sistemas = this.transformDataToItems(data.sistemas);
        this.tinciones = this.transformDataToItems(data.tinciones);
        this.tags = this.transformDataToItems(data.tags);
      },
      error: err => {
        if (err.status === 403 && err.error.code === 'token_not_valid') {
          this.authService.refreshToken().subscribe({
            next: (response: any) => {
              this.authService.setToken(response.access);
              this.loadData();
            },
            error: refreshErr => {
              console.error('Error al refrescar el token:', refreshErr);
              this.authService.logout();
            }
          });
        } else {
          console.error('Error al obtener filtros:', err);
        }
      }
    });
  }

  private transformDataToItems(data: any[]): Item[] {
    if (!data) return [];
    return data.map((item: any) => ({ nombre: item.name || item }));
  }

  filterMuestras(): void {
    this.api.filterMuestras(this.selectedFilters,).subscribe({
      next: (tejidos: Tejido[]) => {
        this.listaTejidos_show = tejidos;
        this.obtenerSistemasUnicos();
      },
      error: err => {
        console.error('Error al filtrar muestras:', err);
      }
    });
  }

  updateSelectedFilters(type: string, items: string[]): void {
    this.selectedFilters[type] = items;
    this.filterMuestras();
  }

  obtenerSistemasUnicos() {
    const sistemasSet = new Set<string>();
    this.listaTejidos_show.forEach(tejido => {
      if (tejido.sistemas && tejido.sistemas.length > 0) {
        tejido.sistemas.forEach(sistema => sistemasSet.add(sistema));
      }
    });
    this.sistemasUnicos = Array.from(sistemasSet);
    this.sistemasUnicosFormateados = this.sistemasUnicos.map(sistema => ({ nombre: sistema }));
  }

  selectCategory(category: string) {
    console.log('Categoría seleccionada:', category);
    if (category === 'all') {
      this.listaTejidos_show = this.listaTejidos_all;
    } else {
      this.api.getTejidos(category).subscribe({
        next: (tejidos: Tejido[]) => {
          this.listaTejidos_show = tejidos;
          this.obtenerSistemasUnicos();
        },
        error: err => {
          console.error('Error al obtener tejidos por categoría:', err);
        }
      });
    }
    this.obtenerSistemasUnicos();
  }

  drawPoint(event: MouseEvent) {
    console.log(event.offsetX, event.offsetY);
  }

  getMuestrasPorSistema(sistema: string): Tejido[] {
    return this.listaTejidos_show.filter(muestra => muestra.sistemas.includes(sistema));
  }

  getMuestrasSinSistema(): Tejido[] {
    return this.listaTejidos_show.filter(muestra => !muestra.sistemas || muestra.sistemas.length === 0);
  }

  updateNota(id: number, nota: any): void {
    this.api.updateNota(id, nota).subscribe({
      next: (response: any) => {
        console.log('Nota actualizada exitosamente', response);
      },
      error: err => {
        console.error('Error al actualizar la nota:', err);
      }
    });
  }
}
