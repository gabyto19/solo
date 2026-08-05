import { Component, OnInit } from '@angular/core';
import { AdminService, ManagedUser, PriceState } from '../services/admin.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css',
})
export class AdminComponent implements OnInit {
  users: ManagedUser[] = [];
  loading = true;
  error = '';
  notice = '';

  // New-user form
  newEmail = '';
  newPassword = '';
  newRole: 'admin' | 'user' = 'user';
  creating = false;

  // Price list
  states: PriceState[] = [];
  stateFilter = '';
  statesLoading = false;
  editingId: number | null = null;
  editPrice = '';

  constructor(private admin: AdminService, public auth: AuthService) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  private loadUsers(): void {
    this.loading = true;
    this.admin.listUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.loading = false;
      },
      error: (err) => {
        this.error = this.describe(err);
        this.loading = false;
      },
    });
  }

  createUser(): void {
    const email = this.newEmail.trim();
    if (!email || this.newPassword.length < 8) {
      this.error = 'ელფოსტა და მინიმუმ 8-სიმბოლოიანი პაროლი აუცილებელია.';
      return;
    }

    this.creating = true;
    this.error = '';
    this.admin.createUser(email, this.newPassword, this.newRole).subscribe({
      next: (user) => {
        this.users = [...this.users, user];
        this.newEmail = '';
        this.newPassword = '';
        this.newRole = 'user';
        this.creating = false;
        this.notice = `მომხმარებელი შეიქმნა: ${user.email}`;
      },
      error: (err) => {
        this.error = this.describe(err);
        this.creating = false;
      },
    });
  }

  toggleActive(user: ManagedUser): void {
    this.admin.updateUser(user.id, { is_active: !user.is_active }).subscribe({
      next: (updated) => this.replaceUser(updated),
      error: (err) => (this.error = this.describe(err)),
    });
  }

  toggleRole(user: ManagedUser): void {
    this.admin
      .updateUser(user.id, { role: user.role === 'admin' ? 'user' : 'admin' })
      .subscribe({
        next: (updated) => this.replaceUser(updated),
        error: (err) => (this.error = this.describe(err)),
      });
  }

  resetPassword(user: ManagedUser): void {
    const next = prompt(`ახალი პაროლი ${user.email}-სთვის (მინ. 8 სიმბოლო):`);
    if (!next) return;
    this.admin.updateUser(user.id, { password: next }).subscribe({
      next: () => (this.notice = `პაროლი განახლდა: ${user.email}`),
      error: (err) => (this.error = this.describe(err)),
    });
  }

  removeUser(user: ManagedUser): void {
    if (!confirm(`წავშალოთ ${user.email}?`)) return;
    this.admin.deleteUser(user.id).subscribe({
      next: () => {
        this.users = this.users.filter((u) => u.id !== user.id);
        this.notice = `წაშლილია: ${user.email}`;
      },
      error: (err) => (this.error = this.describe(err)),
    });
  }

  private replaceUser(updated: ManagedUser): void {
    this.users = this.users.map((u) => (u.id === updated.id ? updated : u));
  }

  // ── Price list ────────────────────────────────────────────────

  loadStates(): void {
    if (this.states.length || this.statesLoading) return;
    this.statesLoading = true;
    this.admin.listStates().subscribe({
      next: (states) => {
        this.states = states;
        this.statesLoading = false;
      },
      error: (err) => {
        this.error = this.describe(err);
        this.statesLoading = false;
      },
    });
  }

  get filteredStates(): PriceState[] {
    const q = this.stateFilter.trim().toLowerCase();
    const list = q ? this.states.filter((s) => s.name.toLowerCase().includes(q)) : this.states;
    // Only ever render a slice — the table holds 400+ rows.
    return list.slice(0, 40);
  }

  startEdit(state: PriceState): void {
    this.editingId = state.id;
    this.editPrice = String(state.price);
  }

  saveEdit(state: PriceState): void {
    const price = Number(this.editPrice);
    if (!Number.isFinite(price) || price < 0) {
      this.error = 'ფასი უნდა იყოს დადებითი რიცხვი.';
      return;
    }
    this.admin.updateState(state.id, { price }).subscribe({
      next: (updated) => {
        this.states = this.states.map((s) => (s.id === updated.id ? updated : s));
        this.editingId = null;
        this.notice = `${updated.name} → ${updated.price}`;
      },
      error: (err) => (this.error = this.describe(err)),
    });
  }

  cancelEdit(): void {
    this.editingId = null;
  }

  private describe(err: any): string {
    if (err?.status === 0) return 'სერვერთან კავშირი ვერ დამყარდა.';
    return err?.error?.error || err?.message || 'უცნობი შეცდომა.';
  }
}
