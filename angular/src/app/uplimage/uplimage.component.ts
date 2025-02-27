import { Component, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { catchError, switchMap, throwError } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-uplimage',
  templateUrl: './uplimage.component.html',
  styleUrls: ['./uplimage.component.css'],
  imports: [ReactiveFormsModule, CommonModule]
})
export class UplimageComponent implements OnInit {
  sampleForm: FormGroup;
  categories: any[] = [];
  organos: any[] = [];
  sistemas: any[] = [];
  tinciones: any[] = [];
  isCreatingNewCategory = false;
  isCreatingNewOrgano = false;
  isCreatingNewSistema = false;
  isCreatingNewTincion = false;
  selectedFiles: File[] = [];

  constructor(private fb: FormBuilder, private http: HttpClient, private authService: AuthService) {
    this.sampleForm = this.fb.group({
      name: ['', Validators.required],
      category: ['', Validators.required],
      newCategory: [''],
      organo: ['', Validators.required],
      newOrgano: [''],
      sistema: [''],
      newSistema: [''],
      tincion: ['', Validators.required],
      newTincion: [''],
      images: this.fb.array([], Validators.required) // Validación para asegurar que se suban imágenes
    });
  }

  ngOnInit() {
    this.loadCategories();
    this.loadOrganos();
    this.loadSistemas();
    this.loadTinciones();
  }

  loadTinciones() {
    this.http.get('http://localhost:8000/api/tinciones/').subscribe((data: any) => {
      this.tinciones = data;
    });
  }
  
  loadCategories() {
    const headers = this.authService.getAuthHeaders();
    this.http.get('http://localhost:8000/api/categorias/', { headers, withCredentials: true }).subscribe((data: any) => {
      this.categories = data;
    });
  }

  loadOrganos() {
    const headers = this.authService.getAuthHeaders();
    this.http.get('http://localhost:8000/api/organos/', { headers, withCredentials: true }).subscribe((data: any) => {
      this.organos = data;
    });
  }

  loadSistemas() {
    const headers = this.authService.getAuthHeaders();
    this.http.get('http://localhost:8000/api/sistemas/', { headers, withCredentials: true }).subscribe((data: any) => {
      this.sistemas = data;
    });
  }

  onTincionChange(event: any) {
    const value = event.target.value;
    this.isCreatingNewTincion = value === 'new';
  }

  onCategoryChange(event: any) {
    const value = event.target.value;
    this.isCreatingNewCategory = value === 'new';
  }

  onOrganoChange(event: any) {
    const value = event.target.value;
    this.isCreatingNewOrgano = value === 'new';

    if (!this.isCreatingNewOrgano) {
      const selectedOrgano = this.organos.find(organo => organo.id === value);
      if (selectedOrgano && selectedOrgano.sistema) {
        this.sampleForm.patchValue({ sistema: selectedOrgano.sistema.id });
      } else {
        this.sampleForm.patchValue({ sistema: null });
      }
    }
  }

  onSistemaChange(event: any) {
    const value = event.target.value;
    this.isCreatingNewSistema = value === 'new';
  }

  onFileChange(event: any) {
    const files = event.target.files;
    if (files.length > 0) {
      this.selectedFiles = Array.from(files);
      this.imageFormArray.clear();
      this.selectedFiles.forEach(() => this.imageFormArray.push(this.fb.control('')));
    }
  }

  get imageFormArray(): FormArray {
    return this.sampleForm.get('images') as FormArray;
  }

  onSubmit() {
    if (this.sampleForm.invalid) {
      console.error('Formulario inválido:', this.sampleForm.errors);
      return;
    }
  
    const formData = new FormData();
    formData.append('name', this.sampleForm.get('name')?.value);
  
    // Handle category creation/selection
    if (this.isCreatingNewCategory) {
      const newCategoryValue = this.sampleForm.get('newCategory')?.value;
      if (newCategoryValue) {
        formData.append('new_category', newCategoryValue);
      }
    } else {
      const categoryValue = this.sampleForm.get('category')?.value;
      formData.append('categoria_ids', JSON.stringify([parseInt(categoryValue)]));
    }

    // Handle organ and system creation/selection
    if (this.isCreatingNewOrgano) {
      const newOrganoValue = this.sampleForm.get('newOrgano')?.value;
      if (newOrganoValue) {
        formData.append('new_organo', newOrganoValue);
        
        if (this.isCreatingNewSistema) {
          const newSistemaValue = this.sampleForm.get('newSistema')?.value;
          if (newSistemaValue) {
            formData.append('new_sistema', newSistemaValue);
          }
        } else {
          const sistemaValue = this.sampleForm.get('sistema')?.value;
          if (sistemaValue) {
            formData.append('sistema_ids', JSON.stringify([parseInt(sistemaValue)]));
          }
        }
      }
    } else {
      const organoValue = this.sampleForm.get('organo')?.value;
      formData.append('organo_ids', JSON.stringify([parseInt(organoValue)]));
    }

    // Handle tincion creation/selection
    if (this.isCreatingNewTincion) {
      const newTincionValue = this.sampleForm.get('newTincion')?.value;
      if (newTincionValue) {
        formData.append('new_tincion', newTincionValue);
      }
    } else {
      const tincionValue = this.sampleForm.get('tincion')?.value;
      formData.append('tincion_ids', JSON.stringify([parseInt(tincionValue)]));
    }
  
    // Add images
    this.selectedFiles.forEach((file) => {
      formData.append('images', file, file.name);
    });

    // Debug log
    console.log('Sending form data:');
    formData.forEach((value, key) => {
      console.log(`${key}: ${value}`);
    });

    // Enviar solicitud al servidor
    this.http.post('http://localhost:8000/api/uplimage/', formData, { 
      withCredentials: true 
    }).pipe(
      catchError(error => {
        if (error.status === 403 && error.error?.code === 'token_not_valid') {
          return this.authService.refreshToken().pipe(
            switchMap(() => {
              return this.http.post('http://localhost:8000/api/uplimage/', formData, { 
                withCredentials: true 
              });
            })
          );
        }
        return throwError(() => error);
      })
    ).subscribe({
      next: (response: any) => {
        console.log('Muestra creada exitosamente:', response);
        if (response.id && response.name) {
          this.resetForm();
          // Show comprehensive success message
          const details = response.details;
          const message = `
            Muestra creada exitosamente:
            - Nombre: ${response.name}
            - Categorías: ${details.categorias.join(', ')}
            - Órganos: ${details.organos.join(', ')}
            - Sistemas: ${details.sistemas.join(', ')}
            - Tinciones: ${details.tinciones.join(', ')}
            - Número de capturas: ${response.capturas.length}
          `;
          alert(message);
        } else {
          console.warn('Respuesta inesperada:', response);
        }
      },
      error: (err) => {
        console.error('Error al crear la muestra:', err);
        if (err.error?.error) {
          // Handle structured error
          console.error('Error details:', err.error.error);
          alert('Error al crear la muestra: ' + err.error.error);
        } else {
          // Handle generic error
          console.error('Error details:', err.error);
          alert('Error al crear la muestra. Por favor, intente de nuevo.');
        }
      }
    });
  }
  
  resetForm() {
    this.sampleForm.reset();
    this.selectedFiles = [];
    this.imageFormArray.clear();
    this.isCreatingNewCategory = false;
    this.isCreatingNewOrgano = false;
    this.isCreatingNewSistema = false;
  }
}
