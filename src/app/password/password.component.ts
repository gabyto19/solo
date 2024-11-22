import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-password',
  templateUrl: './password.component.html',
  styleUrls: ['./password.component.css']
})
export class PasswordComponent {

  password: string = '';
  errorMessage: string = '';

  constructor(private router: Router) {}

  onSubmit() {
    if (this.password === 'DTMS!') { // Replace with your actual password
      sessionStorage.setItem('password', this.password); // Store password in sessionStorage
      this.router.navigate(['/deposit']); // Redirect to deposit page
    } else {
      this.errorMessage = 'Incorrect password. Please try again.';
    }
  }
}
