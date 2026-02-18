// src/utils/carData.js

export const carBrands = [
  "Toyota", "Chevrolet", "Hyundai", "Nissan", "Kia", "Suzuki", 
  "Peugeot", "Ford", "Mazda", "Volkswagen", "Honda", "Subaru", 
  "Chery", "MG", "Mitsubishi", "Renault", "Citroën", 
  "JAC", "Changan", "GWM", "SsangYong", "Foton", "Maxus", 
  "Karry", "Shineray", "Brilliance", "DFSK", "Hafei", "KYC",
  "Fiat", "Jeep", "Ram", "BMW", "Mercedes-Benz", "Audi", "Volvo"
].sort()

export const carModels = {
  "Toyota": ["Yaris 1.5", "Yaris Sport", "Corolla 1.8", "Hilux 2.4", "Hilux 2.8", "RAV4", "Rush", "Tercel", "4Runner 4.0", "Prius", "Etios", "Avanza", "Raize", "Hiace"],
  
  "Chevrolet": ["Spark Lite 1.0", "Spark GT 1.2", "Sail 1.4", "Sail 1.5", "Tracker", "Captiva", "Silverado", "D-Max", "Colorado", "Optra", "Onix 1.0T", "Onix 1.2", "Spin", "Groove", "N300 Max", "N400"],
  
  "Hyundai": ["Accent 1.4", "Accent 1.6", "Tucson", "Santa Fe", "Elantra", "i10", "Grand i10", "Creta", "H-1", "Porter 2.5", "Sonata", "Venue"],
  
  "Nissan": ["Versa", "Navara 2.3", "Navara 2.5", "Qashqai", "Kicks", "X-Trail", "Sentra", "Terrano 2.5", "March 1.6", "NP300", "Tiida", "V16 1.6", "Urvan"],
  
  "Kia": ["Rio 4", "Rio 5", "Morning 1.0", "Morning 1.2", "Sportage", "Sorento", "Cerato", "Frontier 2.5", "Soluto", "Sonet", "Seltos", "Bongo"],
  
  "Suzuki": ["Swift 1.2", "Swift Sport 1.4T", "Baleno", "Vitara", "Grand Vitara", "Jimny", "Alto 800", "Alto K10", "Dzire", "S-Presso", "Celerio", "Ertiga", "Carry"],
  
  "Peugeot": ["208 1.2", "208 1.5 BlueHDi", "2008", "308", "3008", "Partner 1.6 HDI", "Expert", "Rifter", "Boxer"],
  
  "Ford": ["Ranger 2.2", "Ranger 3.2", "F-150 3.5", "F-150 5.0", "Explorer", "Escape", "Territory", "EcoSport", "Transit", "Fiesta", "Focus"],
  
  "Mazda": ["Mazda 3 1.6", "Mazda 3 2.0", "Mazda 2", "CX-5", "CX-30", "BT-50 2.2", "BT-50 3.2", "Mazda 6"],
  
  "Volkswagen": ["Gol 1.6", "Polo", "T-Cross", "Amarok 2.0", "Amarok 3.0 V6", "Tiguan", "Saveiro", "Nivus", "Taos", "Jetta", "Voyage", "Crafter"],
  
  "Honda": ["Civic 1.5T", "Accord", "CR-V", "HR-V", "Pilot", "Fit", "City"],
  
  "Subaru": ["Forester 2.0", "Forester 2.5", "XV 1.6", "XV 2.0", "Outback", "Impreza", "Legacy", "WRX"],
  
  "Chery": ["Tiggo 2", "Tiggo 2 Pro", "Tiggo 3", "Tiggo 7 Pro", "Tiggo 8", "IQ 1.0", "Arrizo 5"],
  
  "MG": ["MG3 1.5", "MG ZS", "MG HS", "MG5", "MG RX5", "MG ZX"],
  
  "Mitsubishi": ["L200 2.4 Work", "L200 2.4 Katana", "Montero", "Montero Sport", "Outlander", "Mirage", "Eclipse Cross", "Canter"],
  
  "Renault": ["Clio", "Symbol", "Duster", "Oroch", "Kangoo", "Koleos", "Stepway", "Alaskan"],
  
  "Citroën": ["C3", "C4 Cactus", "C5 Aircross", "Berlingo 1.6 HDI", "Jumper", "C-Elysee"],
  
  "JAC": ["T6", "T8", "S2", "S3", "S4", "Refine", "Sunray", "X200 Cabina Simple", "X200 Cabina Doble"],
  
  "Changan": ["CS15", "CS35 Plus", "CS55 Plus", "Hunter", "MD201 Cargo", "MD201 PickUp", "CX70", "Alsvin", "M201"],
  
  "GWM": ["Poer", "Wingle 5 2.0", "Wingle 5 2.2", "Wingle 7", "Haval H6", "Haval Jolion", "Voleex C30", "Socool", "Deer"],
  
  "SsangYong": ["Actyon Sports 2.0", "Korando", "Rexton", "Tivoli", "Musso", "Musso Grand", "Stavic"],
  
  "Foton": ["Terracota", "Tunland", "Midi", "View CS2", "TM1 Cabina Simple", "TM3", "Aumark"],
  
  "Maxus": ["T60 2.8", "T60 2.0", "T90", "V80", "V90", "G10", "Deliver 9"],
  
  "Karry": ["Q22", "Q22B", "Q22 Cabina Simple", "Q22 Cabina Doble"],
  
  "Shineray": ["X30", "T30", "T32", "G01"],
  
  "Brilliance": ["V3", "V5", "X30", "T30"],
  
  "DFSK": ["580", "560", "Cargo Van 1.3", "Truck Cabina Simple 1.3", "Truck Cabina Doble"],
  
  "Hafei": ["Minica", "Ruiyi", "Zhongyi"],
  
  "KYC": ["X5", "X5 Plus", "T3", "V3", "Mamut Cabina Simple", "Mamut Cabina Doble"],
  
  "Fiat": ["Fiorino Fire", "Fiorino City", "Strada", "Toro", "Argo", "Mobi", "Cronos", "Ducato"],
  
  "Jeep": ["Compass", "Renegade", "Grand Cherokee", "Wrangler"],
  
  "Ram": ["Ram 700", "Ram 1000", "Ram 1500", "Ram 2500", "Promaster"],
  
  "BMW": ["Serie 1", "Serie 2", "Serie 3", "X1", "X3", "X5"],
  
  "Mercedes-Benz": ["Clase A", "Clase C", "Sprinter 313", "Sprinter 315", "Vito", "Citan"],
  
  "Audi": ["A1", "A3", "A4", "Q2", "Q3", "Q5"],
  
  "Volvo": ["V40", "XC40", "XC60", "XC90"]
}