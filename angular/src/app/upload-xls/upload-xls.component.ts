import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';

interface ICurso {
  id?: number;
  asignatura: string;
  anio: number;
  semestre: boolean;
  grupo: string;
  isSpecial?: boolean;  // Agregar esta propiedad opcional
}

interface IAlumno {
  id?: number;
  name: string;
  user: {
    email: string;
  };
}

@Component({
  selector: 'app-upload-xls',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './upload-xls.component.html',
  styleUrls: ['./upload-xls.component.css']
})
export class UploadXlsComponent implements OnInit {
  uploadForm: FormGroup;
  cursos: ICurso[] = [];
  alumnos: IAlumno[] = [];
  selectedCurso: ICurso | null = null;
  editingAlumno: IAlumno | null = null;
  showNewCursoForm = false;
  showNewAlumnoForm = false;
  cursoForm: ICurso = {
    asignatura: '',
    anio: new Date().getFullYear(),
    semestre: true,
    grupo: ''
  };
  alumnoForm: IAlumno = {
    name: '',
    user: {
      email: ''
    }
  };
  editingCurso: ICurso | null = null;
  isCreatingCurso = false;
  createdAlumnos: any[] = [];
  lastCreatedCurso: any = null;
  alumnosSinCurso: IAlumno[] = [];
  cursosConEspecial: (ICurso | { 
    id: number; 
    asignatura: string; 
    anio: number; 
    semestre: boolean; 
    grupo: string; 
    isSpecial?: boolean 
  })[] = [];

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private authService: AuthService
  ) {
    this.uploadForm = this.fb.group({
      file: [null],
      asignatura: ['', Validators.required],
      anio: [new Date().getFullYear(), Validators.required],
      semestre: ['', Validators.required],
      grupo: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadCursos();
    this.loadAlumnos();
    this.loadAlumnosSinCurso();
  }

  loadCursos(): void {
    this.apiService.getCursos().subscribe({
      next: (response: any) => {
        this.cursos = response;
        this.updateCursosConEspecial();
        console.log('Cursos loaded successfully', response);
      },
      error: (error: any) => {
        if (error.status === 403 && error.error.code === 'token_not_valid') {
          this.authService.refreshToken().subscribe({
            next: (response: any) => {
              this.authService.setToken(response.access);
              this.loadCursos(); // Retry after token refresh
            },
            error: (refreshErr) => {
              console.error('Error refreshing token:', refreshErr);
              this.authService.logout(); // Logout if refresh fails
            }
          });
        } else {
          console.error('Error loading cursos', error);
        }
      }
    });
  }

  loadAlumnos(): void {
    this.apiService.getAlumnos().subscribe({
      next: (response: any) => {
        this.alumnos = response;
        console.log('Alumnos loaded successfully', response);
      },
      error: (error: any) => {
        if (error.status === 403 && error.error.code === 'token_not_valid') {
          this.authService.refreshToken().subscribe({
            next: (response: any) => {
              this.authService.setToken(response.access);
              this.loadAlumnos(); // Retry after token refresh
            },
            error: (refreshErr) => {
              console.error('Error refreshing token:', refreshErr);
              this.authService.logout(); // Logout if refresh fails
            }
          });
        } else {
          console.error('Error loading alumnos', error);
        }
      }
    });
  }

  loadAlumnosSinCurso(): void {
    this.apiService.getAlumnosSinCurso().subscribe({
      next: (response: any) => {
        this.alumnosSinCurso = response;
        this.updateCursosConEspecial();
      },
      error: (error: any) => {
        console.error('Error loading alumnos sin curso:', error);
      }
    });
  }

  onFileChange(event: any) {
    const file = event.target.files[0];
    this.uploadForm.patchValue({
      file: file
    });
  }

  onSubmit() {
    const file = this.uploadForm.get('file')?.value;
    if (file && this.uploadForm.valid) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('asignatura', this.uploadForm.get('asignatura')?.value);
      formData.append('anio', this.uploadForm.get('anio')?.value.toString());
      formData.append('semestre', this.uploadForm.get('semestre')?.value.toString());
      formData.append('grupo', this.uploadForm.get('grupo')?.value);

      this.apiService.uploadXls(formData).subscribe({
        next: (response) => {
          console.log('File uploaded successfully', response);
          this.loadCursos(); // Recargar la lista de cursos
          this.uploadForm.reset({
            anio: new Date().getFullYear(),
            semestre: '',
            grupo: ''
          });
        },
        error: (error) => {
          if (error.status === 403 && error.error.code === 'token_not_valid') {
            this.handleTokenRefresh(() => this.onSubmit());
          } else {
            console.error('Error uploading file', error);
          }
        }
      });
    }
  }

  private handleTokenRefresh(retryCallback: () => void): void {
    this.authService.refreshToken().subscribe({
      next: (response: any) => {
        this.authService.setToken(response.access);
        retryCallback();
      },
      error: (refreshErr) => {
        console.error('Error al refrescar el token:', refreshErr);
        this.authService.logout();
      }
    });
  }

  selectCurso(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const cursoId = Number(selectElement.value);
    const selectedCurso = this.cursos.find(curso => curso.id === cursoId);
    if (selectedCurso) {
      this.selectedCurso = selectedCurso;
      this.loadAlumnosByCurso(cursoId);
    }
  }

  selectCursoFromList(curso: ICurso): void {
    this.selectedCurso = curso;
    if (curso.id === -1) {
      // Si es el curso especial, mostrar alumnos sin curso
      this.alumnos = this.alumnosSinCurso;
    } else if (curso.id) {
      this.loadAlumnosByCurso(curso.id);
    }
  }

  loadAlumnosByCurso(cursoId: number): void {
    this.apiService.getAlumnosByCurso(cursoId).subscribe({
      next: (response: any) => {
        this.alumnos = response;
      },
      error: (error: any) => {
        if (error.status === 403 && error.error.code === 'token_not_valid') {
          this.authService.refreshToken().subscribe({
            next: (response: any) => {
              this.authService.setToken(response.access);
              this.loadAlumnosByCurso(cursoId); // Retry after token refresh
            },
            error: (refreshErr) => {
              console.error('Error refreshing token:', refreshErr);
              this.authService.logout(); // Logout if refresh fails
            }
          });
        } else {
          console.error('Error loading alumnos for curso', error);
        }
      }
    });
  }

  addAlumno(alumno: any): void {
    this.apiService.addAlumno(alumno).subscribe({
      next: (response: any) => {
        this.alumnos.push(response);
      },
      error: (error: any) => {
        console.error('Error adding alumno', error);
      }
    });
  }

  editAlumno(alumno: any): void {
    this.editingAlumno = { ...alumno };
  }

  updateAlumno(alumno: any): void {
    if (!alumno.id) {
      console.error('Error: Alumno ID is undefined');
      return;
    }

    // Prepare update data
    const updateData = {
      name: alumno.name,
      curso: this.selectedCurso ? [this.selectedCurso.id] : alumno.curso,
      user: {
        email: alumno.user.email
      }
    };

    this.apiService.updateAlumno(alumno.id, updateData).subscribe({
      next: (response: any) => {
        const index = this.alumnos.findIndex(a => a.id === alumno.id);
        if (index !== -1) {
          this.alumnos[index] = response;
        }
        this.editingAlumno = null;
      },
      error: (error: any) => {
        if (error.status === 403 && error.error.code === 'token_not_valid') {
          this.authService.refreshToken().subscribe({
            next: (response: any) => {
              this.authService.setToken(response.access);
              this.updateAlumno(alumno);
            },
            error: (refreshErr) => {
              console.error('Error refreshing token:', refreshErr);
              this.authService.logout();
            }
          });
        } else {
          console.error('Error updating alumno:', error);
          alert('Error al actualizar el alumno: ' + (error.error?.detail || 'Error desconocido'));
        }
      }
    });
  }

  deleteAlumno(alumnoId: number): void {
    if (confirm('¿Estás seguro de que deseas eliminar este alumno?')) {
      this.apiService.deleteAlumno(alumnoId).subscribe({
        next: () => {
          this.alumnos = this.alumnos.filter(a => a.id !== alumnoId);
        },
        error: (error: any) => {
          console.error('Error deleting alumno', error);
        }
      });
    }
  }

  deleteAlumnoById(id: number | undefined): void {
    if (!id || !this.selectedCurso?.id) return;
    
    if (confirm('¿Estás seguro de que deseas quitar este alumno del curso?')) {
      this.apiService.removeAlumnoFromCurso(id, this.selectedCurso.id).subscribe({
        next: () => {
          this.alumnos = this.alumnos.filter(a => a.id !== id);
          // Recargar la lista de alumnos sin curso después de remover
          this.loadAlumnosSinCurso();
        },
        error: (error) => {
          console.error('Error removing alumno from curso:', error);
          alert('Error al quitar el alumno del curso: ' + 
                (error.error?.detail || 'Error desconocido'));
        }
      });
    }
  }

  backToCursos(): void {
    this.selectedCurso = null;
    this.editingAlumno = null;
    this.showNewAlumnoForm = false;
  }

  editCurso(curso: any): void {
    this.editingCurso = curso;
    this.cursoForm = { ...curso };
    this.showNewCursoForm = true;
  }

  saveCurso(): void {
    this.isCreatingCurso = true;
    
    if (this.editingCurso && this.editingCurso.id) {
      this.apiService.updateCurso(this.editingCurso.id, this.cursoForm).subscribe({
        next: (response) => {
          const index = this.cursos.findIndex(c => c.id === this.editingCurso?.id);
          if (index !== -1) {
            this.cursos[index] = response;
          }
          this.resetCursoForm();
          this.isCreatingCurso = false;
        },
        error: (error) => {
          console.error('Error updating curso:', error);
          this.isCreatingCurso = false;
        }
      });
    } else {
      this.apiService.addCurso(this.cursoForm).subscribe({
        next: (response) => {
          this.cursos.push(response);
          this.lastCreatedCurso = response;
          this.resetCursoForm();
          this.isCreatingCurso = false;
        },
        error: (error) => {
          console.error('Error adding curso:', error);
          this.isCreatingCurso = false;
        }
      });
    }
  }

  deleteCurso(id: number): void {
    if (!this.authService.isProfesor()) {
      alert('Solo los profesores pueden eliminar cursos');
      return;
    }

    if (confirm('¿Estás seguro de que deseas eliminar este curso?')) {
      this.apiService.deleteCurso(id).subscribe({
        next: () => {
          this.cursos = this.cursos.filter(c => c.id !== id);
        },
        error: (error) => {
          if (error.status === 403) {
            alert('No tienes permisos para eliminar cursos');
          } else if (error.status === 403 && error.error.code === 'token_not_valid') {
            this.authService.refreshToken().subscribe({
              next: (response: any) => {
                this.authService.setToken(response.access);
                this.deleteCurso(id);
              },
              error: (refreshErr) => {
                console.error('Error refreshing token:', refreshErr);
                this.authService.logout();
              }
            });
          } else {
            console.error('Error deleting curso:', error);
            alert('Error al eliminar el curso: ' + (error.error?.detail || 'Error desconocido'));
          }
        }
      });
    }
  }

  deleteCursoById(id: number | undefined): void {
    if (!id) return;
    
    if (confirm('¿Estás seguro de que deseas eliminar este curso?')) {
      this.apiService.deleteCurso(id).subscribe({
        next: () => {
          this.cursos = this.cursos.filter(c => c.id !== id);
        },
        error: (error) => console.error('Error deleting curso:', error)
      });
    }
  }

  resetCursoForm(): void {
    this.cursoForm = {
      asignatura: '',
      anio: new Date().getFullYear(),
      semestre: true,
      grupo: ''
    };
    this.editingCurso = null;
    this.showNewCursoForm = false;
  }

  cancelAlumnoEdit(): void {
    this.editingAlumno = null;
    this.showNewAlumnoForm = false;
  }

  saveAlumno(): void {
    // ...existing updateAlumno code...
  }

  private updateCursosConEspecial(): void {
    const cursoEspecial: ICurso = {
      id: -1,
      asignatura: 'Alumnos sin curso',
      anio: new Date().getFullYear(),
      semestre: true,
      grupo: '-',
      isSpecial: true
    };

    this.cursosConEspecial = [...this.cursos, cursoEspecial];
  }
}
