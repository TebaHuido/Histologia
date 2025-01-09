import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams} from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { Tejido, Muestra, Label, Tag, Profesor, Alumno } from './tejidos.mock';
import { AuthService } from './auth.service';

// Add interfaces at the file level, outside the class
export interface UpdateMuestraRequest {
  name: string;
  public: boolean;
  Categoria?: any[];
  organo?: any[];
  tincion?: any[];
}

export interface UpdateMuestraResponse {
  id: number;
  name: string;
  public: boolean;
  Categoria: any[];
  organo: any[];
  tincion: any[];
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = '/api';  // Cambiado a URL relativa

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      // Add any other headers you need
    });
  }

  private getOptions() {
    return {
      headers: this.getHeaders(),
      withCredentials: true  // Important for CORS with credentials
    };
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    const csrfToken = this.authService.getCSRFToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token || ''}`,
      'X-CSRFToken': csrfToken || ''
    });
  }

  private getAuthOptions() {
    return {
      headers: this.getAuthHeaders(),
      withCredentials: true
    };
  }

  getTejidos(category: string = ''): Observable<Tejido[]> {
    const url = `${this.apiUrl}/tejidos/${category ? `?category=${category}` : ''}`;
    return this.http.get<Tejido[]>(url, { withCredentials: true }).pipe(
      catchError(error => {
        console.error('Error fetching tejidos:', error);
        return throwError(() => error);
      })
    );
  }

  getFilters(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/filters/`, { withCredentials: true });
  }

  filterMuestras(filters: any): Observable<Tejido[]> {
    let params = new HttpParams();
    Object.keys(filters).forEach(key => {
      filters[key].forEach((value: string) => {
        params = params.append(key, value);
      });
    });
    return this.http.get<Tejido[]>(`${this.apiUrl}/muestras/filtrado/`, { params, withCredentials: true });
  }

  getTejido(id: number): Observable<Tejido> {
    return this.http.get<Tejido>(`${this.apiUrl}/tejidos/${id}/`, { withCredentials: true });
  }

  addNota(nota: { nota: any }, options: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/notas/`, nota, this.getOptions());
  }

  updateNota(id: number, nota: { nota: any }): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/notas/${id}/`, nota, this.getOptions());
  }

  deleteNota(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/notas/${id}/`, this.getOptions());
  }

  updateSample(id: number, sample: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/samples/${id}/`, sample, { withCredentials: true });
  }

  uploadXls(formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/upload-xls/`, formData, { 
      withCredentials: true 
    });
  }

  getCursos(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/cursos/`, { 
      withCredentials: true
    });
  }

  getAlumnos(): Observable<Alumno[]> {
    return this.http.get<Alumno[]>(`${this.apiUrl}/alumnos/`, { 
      withCredentials: true 
    }).pipe(
      catchError(error => {
        console.error('Error fetching alumnos:', error);
        return of([]);
      })
    );
  }

  getAlumnosSinCurso(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/alumnos/sin-curso/`);
  }

  // Métodos para gestión de cursos
  addCurso(curso: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/cursos/`, curso, { withCredentials: true });
  }

  updateCurso(id: number, curso: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/cursos/${id}/`, curso, { withCredentials: true });
  }

  deleteCurso(id: number): Observable<any> {
    if (!this.authService.isProfesor()) {
      return new Observable(subscriber => {
        subscriber.error({ error: { detail: 'No tienes permisos para eliminar cursos' } });
      });
    }

    const options = {
      withCredentials: true,
      observe: 'response' as 'response'
    };
    
    return this.http.delete(`${this.apiUrl}/cursos/${id}/`, options);
  }

  // Métodos para gestión de alumnos
  addAlumno(alumno: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/alumnos/`, alumno, { withCredentials: true });
  }

  updateAlumno(id: number, alumno: any): Observable<any> {
    return this.http.put(
      `${this.apiUrl}/alumnos/${id}/`, 
      alumno, 
      { 
        withCredentials: true // Importante para CSRF
      }
    );
  }

  deleteAlumno(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/alumnos/${id}/`, { withCredentials: true });
  }

  getAlumnosByCurso(cursoId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/alumnos/?curso=${cursoId}`, { withCredentials: true });
  }

  removeAlumnoFromCurso(alumnoId: number, cursoId: number): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/alumnos/${alumnoId}/remove-from-curso/`,
      { 
        params: { curso: cursoId.toString() },
        withCredentials: true 
      }
    );
  }

  createLabel(label: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/labels/`, label, {
      withCredentials: true
    }).pipe(
      catchError(error => {
        console.error('Error creating label:', error);
        return throwError(() => ({
          error: error.error?.detail || 'Error al crear la etiqueta',
          status: error.status
        }));
      })
    );
  }

  getTags(): Observable<Tag[]> {
    const headers = new HttpHeaders()
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${this.authService.getToken()}`);

    return this.http.get<Tag[]>(
      `${this.apiUrl}/tags/`,
      {
        headers,
        withCredentials: true
      }
    ).pipe(
      catchError(error => {
        console.error('API Error fetching tags:', error);
        return of([]);
      })
    );
  }

  getLabels(capturaId: number): Observable<Label[]> {
    return this.http.get<Label[]>(
      `${this.apiUrl}/labels/?captura=${capturaId}`, 
      this.getOptions()
    ).pipe(
      catchError(error => {
        console.error('API Error fetching labels:', error);
        return of([]);  // Return empty array on error
      })
    );
  }

  updateLabel(id: number, label: Partial<Label>): Observable<Label> {
    const headers = new HttpHeaders()
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${this.authService.getToken()}`)
      .set('X-CSRFToken', this.authService.getCSRFToken() || '');

    // Clean up the payload to match backend expectations
    const payload = {
      nota: label.nota || '',
      tag: label.tag !== undefined ? label.tag : null,  // Ensure null is sent when no tag
      coordenadas: label.coordenadas || { x: 0, y: 0 },
      public: label.public || false
    };

    console.log('Sending API request with payload:', payload); // Debug log

    return this.http.put<Label>(
      `${this.apiUrl}/labels/${id}/`,
      payload,
      {
        headers,
        withCredentials: true
      }
    ).pipe(
      catchError(error => {
        console.error('API Error:', error);
        return throwError(() => ({
          error: error.error?.detail || error.error || 'Error al actualizar la etiqueta',
          status: error.status
        }));
      })
    );
  }

  deleteLabel(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/labels/${id}/`, {
      withCredentials: true
    }).pipe(
      catchError(error => {
        console.error('Error deleting label:', error);
        return throwError(() => ({
          error: error.error?.detail || 'Error al eliminar la etiqueta',
          status: error.status
        }));
      })
    );
  }

  getProfesores(): Observable<Profesor[]> {
    return this.http.get<Profesor[]>(`${this.apiUrl}/profesores/`, { 
      withCredentials: true 
    }).pipe(
      catchError(error => {
        console.error('Error fetching profesores:', error);
        return of([]);
      })
    );
  }

  getLotes(): Observable<any> {
    return this.http.get(`${this.apiUrl}/lotes/`, this.getAuthOptions());
  }

  getLoteById(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/lotes/${id}/`, this.getOptions());
  }

  createLote(lote: any): Observable<any> {
    // Ensure we're sending the correct payload structure
    const payload = {
      name: lote.name,
      curso_ids: lote.cursoIds?.filter((id: any) => id !== null).map((id: any) => Number(id)) || [],
      muestra_ids: lote.muestraIds?.filter((id: any) => id !== null).map((id: any) => Number(id)) || []
    };

    console.log('Sending create payload:', payload);  // Debug log

    return this.http.post(`${this.apiUrl}/lotes/`, payload, this.getAuthOptions()).pipe(
      tap(response => console.log('Create response:', response)),  // Debug log
      catchError(error => {
        console.error('Error creating lote:', error);
        return throwError(() => error);
      })
    );
  }

  updateLote(id: number, lote: any): Observable<any> {
    // Ensure we're only sending integer IDs
    const payload = {
      name: lote.name,
      curso_ids: (lote.cursoIds || [])
        .filter((id: any) => id !== null)
        .map((id: any) => Number(id)),
      muestra_ids: (lote.muestraIds || [])
        .filter((id: any) => id !== null && !isNaN(parseInt(id)))
        .map((id: any) => Number(id))
    };

    console.log('Sending update payload:', payload);

    return this.http.put(`${this.apiUrl}/lotes/${id}/`, payload, this.getAuthOptions()).pipe(
      tap(response => console.log('Update response:', response)),
      catchError(error => {
        console.error('Error updating lote:', error);
        return throwError(() => error);
      })
    );
  }

  deleteLote(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/lotes/${id}/`, this.getAuthOptions());
  }

  addMuestraToLote(loteId: number, muestraId: number): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/lotes/${loteId}/add_muestra/`, 
      { muestra_id: muestraId }, 
      this.getAuthOptions()
    );
  }

  removeMuestraFromLote(loteId: number, muestraId: number): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/lotes/${loteId}/remove_muestra/`, 
      { muestra_id: muestraId }, 
      this.getAuthOptions()
    );
  }

  getMuestras(): Observable<any> {
    const headers = new HttpHeaders()
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${this.authService.getToken()}`);

    return this.http.get(`${this.apiUrl}/muestras/`, {
      headers,
      withCredentials: true
    }).pipe(
      catchError(error => {
        console.error('Error fetching muestras:', error);
        if (error.status === 403) {
          // Handle token refresh if needed
          console.log('Token invalid, attempting refresh...');
          return this.authService.refreshToken().pipe(
            switchMap(() => this.getMuestras())
          );
        }
        return of([]);
      })
    );
  }

  // Add the updateMuestra method inside the class
  updateMuestra(id: number, data: UpdateMuestraRequest): Observable<UpdateMuestraResponse> {
    return this.http.put<UpdateMuestraResponse>(
      `${this.apiUrl}/muestras/${id}/`,
      data,
      {
        headers: this.getHeaders(),
        withCredentials: true
      }
    ).pipe(
      catchError(error => {
        console.error('Error updating muestra:', error);
        return throwError(() => error);
      })
    );
  }
}