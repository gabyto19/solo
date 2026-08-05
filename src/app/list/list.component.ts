import { Component, OnInit } from '@angular/core';
import { AdminService, PriceState } from '../services/admin.service';

@Component({
  selector: 'app-list',
  templateUrl: './list.component.html',
  styleUrl: './list.component.css',
})
export class ListComponent implements OnInit {
  /**
   * Prices used to be a hard-coded object in this file. They now live in the
   * database, so the administrator can edit them without a redeploy.
   */
  private states: PriceState[] = [];

  filteredStates: string[] = [];
  loading = true;
  error = '';

  constructor(private api: AdminService) {}

  ngOnInit(): void {
    this.api.listStates().subscribe({
      next: (states) => {
        this.states = states;
        this.filteredStates = this.format(states);
        this.loading = false;
      },
      error: (err) => {
        this.error =
          err?.status === 0
            ? 'სერვერთან კავშირი ვერ დამყარდა.'
            : err?.error?.error || 'ფასების ჩატვირთვა ვერ მოხერხდა.';
        this.loading = false;
      },
    });
  }

  private format(states: PriceState[]): string[] {
    return states.map((s) => `${s.name} - $${s.price}`);
  }

  onInputChange(event: any) {
    const inputText = String(event.target.value || '').toLowerCase();
    const matches = this.states.filter((s) => s.name.toLowerCase().includes(inputText));
    this.filteredStates = this.format(matches);
  }
}
