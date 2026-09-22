import { Type } from '@angular/core';
import { DepositComponent } from './deposit/deposit.component';
import { VehicleComponent } from './vehicle/vehicle.component';
import { CalculatorComponent } from './calculator/calculator.component';

/** A page an administrator can grant to an ordinary user. */
export interface AppPage {
  /** URL path, and the key stored in the user's `pages` list. Never rename one in use. */
  key: string;
  /** Shown in the menu and in the admin page's permission dropdown. */
  label: string;
  component: Type<unknown>;
}

/**
 * Every grantable page, in menu order. This list is the only place a page is
 * declared: the routes, the menu and the admin permission dropdown are all
 * built from it, so a page added here appears in all three.
 *
 * New accounts may open only the calculator (api/_lib/db.ts DEFAULT_PAGES)
 * until an administrator grants more. The admin page itself is not listed —
 * it follows the account's role, not a grant.
 */
export const PAGES: ReadonlyArray<AppPage> = [
  { key: 'deposit', label: 'დეპოზიტი', component: DepositComponent },
  { key: 'vehicle', label: 'საფასური', component: VehicleComponent },
  { key: 'calculator', label: 'კალკულატორი', component: CalculatorComponent },
];

/** Where an account lands after signing in, when it may open it. */
export const HOME_PAGE = 'calculator';
