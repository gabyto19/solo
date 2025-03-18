import { Component } from '@angular/core';

@Component({
  selector: 'app-list',
  templateUrl: './list.component.html',
  styleUrl: './list.component.css'
})
export class ListComponent {
// List of states with corresponding prices
statesPrices:any = {
"CA  ADELANTO - CA(COPART)": 2551,
"CA  ANTELOPE - CA(COPART)": 2700,
"CA  Bakersfield - CA(COPART)": 2600,
"GA  Atlanta East - GA(COPART)": 2125,
"GA  Atlanta North - GA(COPART)": 2125,
"GA  Atlanta South - GA(COPART)": 2125,
"GA  Atlanta West - GA(COPART)": 2125,
"GA  Augusta - GA(COPART)": 2050,
"GA  Birmingham - AL(COPART)": 2270,
"NJ  Albany - NY(COPART)": 1920,
"NJ  Altoona - PA(COPART)": 2070,
"NJ  Appleton - WI(COPART)": 2370,
"NJ  Baltimore - MD(COPART)": 1995,
"NJ  Batltimore EAST - MD(COPART)": 1995,
"NJ  Billings - MT(COPART)": 3020,
"TX  Abilene - TX(COPART)": 2240,
"TX  Albuquerque - NM(COPART)": 2480,
"TX  Amarillo - TX(COPART)": 2330,
"TX  Andrews - TX(COPART)": 2200,
"TX  Austin - TX(COPART)": 2140,
"TX  Baton Rouge - LA(COPART)": 2170,
"CA  Casper - WY(COPART)": 3100,
"Canada  Calgary - AB(COPART)": 3490,
"GA  Cartersville - GA(COPART)": 2150,
"NJ  BUFFALO  - NY(COPART)": 2280,
"NJ  Candia - NH(COPART)": 2070,
"NJ  Chambersburg - PA(COPART)": 2060,
"NJ  Charleston - WV(COPART)": 2160,
"NJ  Chicago North - IL(COPART)": 2290,
"NJ  Chicago South - IL(COPART)": 2290,
"NJ  CICERO - IN(COPART)": 2230,
"WA  Boise -ID(COPART)": 2940,
"Canada  Cincutimi - ON(COPART)": 3190,
"Canada  Edmonton - ON(COPART)": 3490,
"GA  China Grove - NC(COPART)": 2105,
"GA  Columbia - SC(COPART)": 2080,
"GA  Concord - NC(COPART)": 2150,
"Suffolk (VA)": 2065,
"GA  Dothan - AL(COPART)": 2250,
"GA  Charlotte - NC(IAAI)": 2150,
"NJ  Cleveland East - OH(COPART)": 2140,
"NJ  Cleveland West - OH(COPART)": 2140,
"NJ  Columbia - MO(COPART)": 2240,
"NJ  Columbus - OH(COPART)": 2150,
"NJ  Danville - VA(COPART)": 2130,
"NJ  Davenport-IA(COPART)": 2270,
"NJ  Dayton - OH(COPART)": 2170,
"North Hollywood (CA)": 2685,
"NJ  Denver - CO(COPART)": 2595,
"NJ  Denver Central - CO(COPART)": 2595,
"NJ  Denver South - CO(COPART)": 2595,
"NJ  Des Moines - IA(COPART)": 2300,
"NJ  Detroit - MI(COPART)": 2265,
"NJ  DYER - IN(COPART)": 2210,
"NJ  Earlingtton - KY(COPART)": 2270,
"NJ  Eldridge - IA(COPART)": 2280,
"NJ  EXETER - RI(COPART)": 1990,
"TX  Colorado Springs - CO(COPART)": 2550,
"TX  Corpus Christi - TX(COPART)": 2150,
"TX  Dallas - TX(COPART)": 2120,
"TX  Dallas South - TX(COPART)": 2120,
"TX  El Paso - TX(COPART)": 2290,
"WA  Eugene - OR(COPART)": 2940,
"AL Huntsville": 2265,
"-  Honolulu - HI(COPART)": 3475,
"CA  Fresno - CA(COPART)": 2695,
"CA  Hayward - CA(COPART)": 2700,
"CA  Helena - MT(COPART)": 3100,
"CA  Las Vegas - NV(COPART)": 2650,
"CA  LONG BEACH - CA(COPART)": 2550,
"CA  Los Angeles - CA(COPART)": 2590,
"CA  OGDEN - UT(COPART)": 2720,
"Southern Illinois (IL)": 2350,
"Canada  Hamilton - ON(COPART)": 2440,
"Canada  Halifax - ON(COPART)": 3290,
"Canada  Kitchener  - ON(COPART)": 2465,
"Canada  London - ON(COPART)": 2475,
"Canada  Moncton - NB(COPART)": 3280,
"Canada  Montreal - QC(COPART)": 2760,
"Canada  Oshawa - ON(COPART)": 2365,
"Canada  Ottawa - ON(COPART)": 2565,
"FL  Ft. Pierce - FL(COPART)": 1995,
"FL  Jacksonville East - FL(COPART)": 2015,
"FL  Jacksonville West - FL(COPART)": 2015,
"FL  Jacksonville North - FL(COPART)": 2015,
"FL  Miami Central - FL(COPART)": 1925,
"FL  Miami North - FL(COPART)": 1925,
"FL  Miami South  - FL(COPART)": 1925,
"FL  Ocala - FL(COPART)": 2075,
"FL  Orlando - FL(COPART)": 1965,
"FL  Orlando North - FL(COPART)": 1965,
"FL  Orlando South - FL(COPART)": 1965,
"GA  FAIRBURN - GA(COPART)": 1990,
"GA  Gastonia - NC(COPART)": 2100,
"GA  Greer - SC(COPART)": 2120,
"GA  Knoxville - TN(COPART)": 2265,
"GA  Lumberton - NC(COPART)": 2040,
"GA  MACON - GA(COPART)": 2050,
"GA  Mebane - NC(COPART)": 1995,
"GA  Memphis - TN(COPART)": 2350,
"GA  Mobile - AL(COPART)": 2295,
"GA  Mobile South - AL(COPART)": 2310,
"GA  MOCKSVILLE - NC(COPART)": 2095,
"GA  Montgomery - AL(COPART)": 2330,
"GA  Nashville - TN(COPART)": 2290,
"GA  North Charleston - SC(COPART)": 2090,
"NJ  Flint - MI(COPART)": 2280,
"NJ  Fort Wayne - IN(COPART)": 2220,
"NJ  FREDERICKSBURG - VA(COPART)": 2040,
"NJ  Freetown - MA(COPART)": 2090,
"NJ  Glassboro East - NJ(COPART)": 1900,
"NJ  Glassboro West - NJ(COPART)": 1900,
"NJ  Hammond - IN(COPART)": 2180,
"NJ  Hampton - VA(COPART)": 2085,
"NJ  Harrisburg - PA(COPART)": 2050,
"NJ  Hartford - CT(COPART)": 1990,
"NJ  Hartford City - CT(COPART)": 1990,
"NJ  Hartford City - IN(COPART)": 2240,
"NJ  HARTFORD SPRINGFIELD - CT(COPART)": 1970,
"NJ  Ionia - MI(COPART)": 2260,
"NJ  Indianapolis - IN(COPART)": 2210,
"NJ  Kansas City - KS(COPART)": 2360,
"NJ  Kincheloe - MI(COPART)": 2610,
"NJ  Lansing - MI(COPART)": 2270,
"NJ  Lexington East - KY(COPART)": 2240,
"NJ  Lexington West - KY(COPART)": 2240,
"NJ  Lincoln - NE(COPART)": 2320,
"NJ  Long Island - NY(COPART)": 1940,
"NJ  Louisville - KY(COPART)": 2300,
"NJ  Lyman, ME(COPART)": 2210,
"NJ  Madison -WI(COPART)": 2390,
"NJ  Milwaukee - WI(COPART)": 2370,
"NJ  Minneapolis - MN(COPART)": 2480,
"NJ  Minneapolis North - MN(COPART)": 2340,
"NJ  Newburgh - NY(COPART)": 1930,
"NJ  North Boston - MA(COPART)": 1990,
"NJ  Peoria - IL(COPART)": 2300,
"NJ  Philadelphia - PA(COPART)": 1910,
"NJ  Philadelphia East- PA(COPART)": 1910,
"TX  Fayetteville - AR(COPART)": 2330,
"TX  Ft. Worth - TX(COPART)": 2190,
"TX  Houston - TX(COPART)": 2080,
"TX  Houston East - TX(COPART)": 2080,
"TX  Jackson - MS(COPART)": 2250,
"TX  Little Rock - AR(COPART)": 2350,
"TX  Longview - TX(COPART)": 2190,
"TX  Lufkin - TX(COPART)": 2130,
"TX  Mcallen - TX(COPART)": 2180,
"TX  New Orleans - LA(COPART)": 2260,
"TX  Oklahoma City - OK(COPART)": 2370,
"WA  Graham - WA(COPART)": 2855,
"WA  North Seattle - WA(COPART)": 2830,
"WA  Pasco - WA(COPART)": 2980,
"CA  Rancho Cucamonga - CA(COPART)": 2575,
"CA  Reno - NV(COPART)": 2820,
"CA  Redding - CA(COPART)": 2800,
"CA  Sacramento - CA(COPART)": 2700,
"CA  Sacramento-Desert View(COPART)": 2700,
"CA  Salt Lake City - UT(COPART)": 2700,
"CA  San Bernardino - CA(COPART)": 2550,
"CA  San Diego - CA(COPART)": 2600,
"CA  San Diego-Desert View(COPART)": 2600,
"CA  San Jose - CA(COPART)": 2650,
"CA  Santa Paula-Desert View(COPART)": 2650,
"Canada  Quebec City  - ON(COPART)": 2790,
"Canada  Regina - SK(COPART)": 3490,
"Canada  Saskatoon - SK(COPART)": 3490,
"FL  Punta Gorda - FL(COPART)": 2050,
"GA  Raleigh - NC(COPART)": 2130,
"GA  Raleigh North - NC(COPART)": 2130,
"GA  Savannah - GA(COPART)": 1920,
"NJ  Pittsburgh WEST - PA(COPART)": 2090,
"NJ  Pittsburgh North - PA(COPART)": 2090,
"NJ  Pittsburgh South - PA(COPART)": 2090,
"NJ  Richmond - VA(COPART)": 2090,
"NJ  Richmond East - VA(COPART)": 2135,
"NJ  Rochester - NY(COPART)": 2090,
"NJ  Scranton - PA(COPART)": 1990,
"NJ  Seaford - DE(COPART)": 2000,
"NJ  Sikeston - MO(COPART)": 2320,
"TX  San Antonio - TX(COPART)": 2180,
"TX  Shreverport - LA(COPART)": 2240,
"WA  Portland North - OR(COPART)": 3000,
"WA  Portland South - OR(COPART)": 3000,
"CA  South Sacramento - CA(COPART)": 2650,
"NJ  Somerville - NJ(COPART)": 1860,
"NJ  South Boston - MA(COPART)": 1970,
"NJ  SOUTHERN ILINOIS - IL(COPART)": 2350,
"CA  Phoenix - AZ(COPART)": 2650,
"CA  Sun Valley - CA(COPART)": 2550,
"CA  Tucson - AZ(COPART)": 2960,
"CA  Vallejo - CA(COPART)": 2650,
"CA  Van Nuys - CA(COPART)": 2550,
"Canada  St Hubert  - ON(COPART)": 3190,
"Canada  St Philibert(COPART)": 3040,
"Canada  St Johons  - ON(COPART)": 3790,
"Canada  Stoufville - ON(COPART)": 2390,
"Canada  Sudbury - ON(COPART)": 2665,
"Canada  Toronto - ON(COPART)": 2365,
"Canada  Vancuver - BC(COPART)": 4190,
"Canada  Winchester - ON(COPART)": 2625,
"Canada  Winnipeg - ON(COPART)": 3465,
"FL  Talahassee - FL(COPART)": 2220,
"FL  Tampa South - FL(COPART)": 2115,
"FL  Tallahassee - FL(COPART)": 2180,
"FL  West Palm Beach - FL(COPART)": 2090,
"GA  SPARTANBURG - SC(COPART)": 2100,
"GA  Springfield - MO(COPART)": 2250,
"GA  Tanner - AL(COPART)": 2240,
"GA  Tifton - GA(COPART)": 2150,
"NJ  St. Cloud - MN(COPART)": 2240,
"NJ  St. Louis - MO(COPART)": 2260,
"NJ  Syracuse - NY(COPART)": 2020,
"Wilmington (NC)": 2230,
"NJ  Trenton - NJ(COPART)": 1850,
"NJ  Walton - KY(COPART)": 2310,
"NJ  Washington DC - DC(COPART)": 1960,
"NJ  West Warren - MA(COPART)": 1980,
"NJ  Wheeling - IL(COPART)": 2120,
"NJ  Wichita - KS(COPART)": 2770,
"NJ  Windham - ME(COPART)": 2150,
"NJ  York Haven - PA(COPART)": 1980,
"TX  Tulsa - OK(COPART)": 2300,
"TX  WACO  - TX(COPART)": 2140,
"WA  Spokane - WA(COPART)": 3080,
"WA  Woodburn - OR(COPART)": 2900,
"LA SHREVEPORT - LA(COPART)": 2270,
};

// List to hold filtered results
filteredStates: string[] = [];

// Function to filter states based on user input
onInputChange(event: any) {
  const inputText = event.target.value.toLowerCase();
  this.filteredStates = [];

  // Filter states that match the user input
  for (let state in this.statesPrices) {
    if (state.toLowerCase().includes(inputText)) {
      this.filteredStates.push(`${state} - $${this.statesPrices[state]}`);
    }
  }
}
}
