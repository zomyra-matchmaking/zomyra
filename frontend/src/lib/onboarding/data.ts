export const INDIAN_CITIES = [
  "Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Ahmedabad", "Chennai", "Kolkata", "Surat",
  "Pune", "Jaipur", "Lucknow", "Kanpur", "Nagpur", "Indore", "Thane", "Bhopal", "Visakhapatnam",
  "Patna", "Vadodara", "Ghaziabad", "Ludhiana", "Agra", "Nashik", "Faridabad", "Meerut",
  "Rajkot", "Varanasi", "Srinagar", "Aurangabad", "Dhanbad", "Amritsar", "Allahabad", "Ranchi",
  "Howrah", "Coimbatore", "Jabalpur", "Gwalior", "Vijayawada", "Jodhpur", "Madurai", "Raipur",
  "Kota", "Guwahati", "Chandigarh", "Mysuru", "Gurugram", "Noida", "Thiruvananthapuram", "Kochi",
  "Goa", "Dehradun", "Shimla",
];

export const PROFESSIONS = [
  "Software Engineer", "Product Manager", "Designer", "Data Scientist", "Doctor", "Dentist",
  "Lawyer", "Chartered Accountant", "Teacher", "Professor", "Entrepreneur", "Marketing Manager",
  "Sales Manager", "Consultant", "Architect", "Civil Engineer", "Mechanical Engineer",
  "Banker", "Financial Analyst", "Investment Banker", "HR Manager", "Researcher",
  "Government Officer", "Defense Personnel", "Pilot", "Journalist", "Writer", "Content Creator",
  "Filmmaker", "Photographer", "Chef", "Nurse", "Pharmacist", "Psychologist", "Therapist",
  "Civil Services", "Startup Founder", "Operations Manager", "Student", "Homemaker", "Other",
];

export const LANGUAGES = [
  "English", "Hindi", "Gujarati", "Marathi", "Tamil", "Telugu",
  "Kannada", "Punjabi", "Bengali", "Malayalam", "Urdu", "Odia",
  "Assamese", "Konkani", "Other",
];

export function cmToImperial(cm: number) {
  const totalInches = Math.round(cm / 2.54);
  const ft = Math.floor(totalInches / 12);
  const inch = totalInches % 12;
  return `${ft}'${inch}"`;
}

export const HEIGHT_MIN_CM = 137;
export const HEIGHT_MAX_CM = 213;
