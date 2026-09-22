import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-password',
  templateUrl: './password.component.html',
  styleUrls: ['./password.component.css'],
})
export class PasswordComponent {
  email: string = '';
  password: string = '';
  errorMessage: string = '';
  submitting = false;

  constructor(private auth: AuthService, private router: Router) {}

  onSubmit() {
    const email = this.email.trim();
    if (!email || !this.password) {
      this.errorMessage = 'შეიყვანეთ ელფოსტა და პაროლი.';
      return;
    }

    this.submitting = true;
    this.errorMessage = '';

    // Credentials are verified on the server; nothing about them is kept in the
    // browser. The session comes back as an HttpOnly cookie the page cannot read.
    this.auth.login(email, this.password).subscribe({
      next: () => {
        const home = this.auth.homePath();
        if (!home) {
          // Signed in, but granted no page at all — there is nowhere to go.
          this.auth.logout().subscribe({ error: () => undefined });
          this.submitting = false;
          this.errorMessage = 'არცერთ გვერდზე წვდომა არ გაქვთ. მიმართეთ ადმინისტრატორს.';
          return;
        }
        this.submitting = false;
        this.router.navigate([home]);
      },
      error: (err) => {
        this.submitting = false;
        this.errorMessage =
          err?.error?.error ||
          (err?.status === 0
            ? 'სერვერთან კავშირი ვერ დამყარდა.'
            : 'შესვლა ვერ მოხერხდა.');
      },
    });
  }
}
