import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-navigation',
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.css'],
})
export class NavigationComponent {
  menuOpen = false;

  constructor(public auth: AuthService, private router: Router) {}

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  logout() {
    this.menuOpen = false;
    // Navigate regardless of the response: the cookie is cleared server-side,
    // and leaving the user on a guarded page after signing out would be worse
    // than an unreported network hiccup.
    this.auth.logout().subscribe({
      next: () => this.router.navigate(['/password']),
      error: () => this.router.navigate(['/password']),
    });
  }
}
