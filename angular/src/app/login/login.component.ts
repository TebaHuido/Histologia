import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule] // Asegúrate de importar ReactiveFormsModule aquí
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;

  constructor(private fb: FormBuilder, private authService: AuthService, private router: Router) {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {}

  onSubmit(): void {
    if (this.loginForm.valid) {
      const { username, password } = this.loginForm.value;
      this.authService.login(username, password).subscribe({
        next: (response: any) => {
          this.router.navigate(['/']);
        },
        error: (error: any) => {
          console.error('Login failed', error);
          let errorMessage = 'Error en el inicio de sesión';
          if (error.error?.detail) {
            errorMessage = error.error.detail;
          }
          // Aquí puedes mostrar el error al usuario (por ejemplo, con un alert o un mensaje en el UI)
          alert(errorMessage);
        }
      });
    }
  }
}
