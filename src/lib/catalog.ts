export const SCHOOL_TO_DEPARTMENTS: Record<string, string[]> = {
  'School of Science and Technology': [
    'Computer Science',
    'Software Engineering',
    'Electrical/Electronics Engineering',
    'Mechanical Engineering',
    'Data Science',
    'Mechatronics Engineering',
  ],
  'School of Media and Communication': [
    'Information and Media Studies',
    'Strategic Communication',
    'Mass Communication',
    'Film and Multimedia Studies',
  ],
  'School of Management and Social Sciences': [
    'Accounting',
    'Business Administration',
    'Economics',
    'Finance',
  ],
}

export const SCHOOLS = Object.keys(SCHOOL_TO_DEPARTMENTS)

export const DEPARTMENTS = Object.values(SCHOOL_TO_DEPARTMENTS).flat()

export const ACADEMIC_FEEDBACK_CATEGORIES = [
  'Course Understanding',
  'Lecturer Teaching Quality',
  'Learning Exposure and New Content',
  'Assessment and Examination',
  'Course Delivery and Pace',
  'Department Administration',
  'Academic Advising',
  'Other',
]

export const NON_ACADEMIC_CATEGORY_TO_UNITS: Record<string, string[]> = {
  'Campus Security': ['security'],
  'Hostel/Accommodation': ['maintenance', 'facilities'],
  'Air Conditioning': ['maintenance'],
  'Electricity/Power': ['maintenance', 'facilities'],
  'Water Supply': ['maintenance'],
  'Sanitation/Cleanliness': ['facilities', 'maintenance'],
  'Cafeteria/Dining': ['cafeteria'],
  'Internet/Wi-Fi': ['facilities'],
  'Sports Facilities': ['facilities'],
  Library: ['facilities'],
  Transport: ['facilities'],
  'Student Welfare': ['facilities'],
  Other: ['facilities'],
}

export const NON_ACADEMIC_CATEGORIES = Object.keys(NON_ACADEMIC_CATEGORY_TO_UNITS)

export const MALE_HOSTELS = [
  'Faith Hall',
  'Amethyst Hall',
  'Emerald Hall',
  'Cooperative Kings Hall',
  'The POD Living Hall',
  'The Enterprise Hostel (EDC)',
]

export const FEMALE_HOSTELS = [
  'Pearl Hall',
  'Trinity Hall',
  'Cooperative Queens Hall',
  'Cedar House',
  'Trezadel Hall',
  'Queen Mary',
  'Redwood House',
]

export const ALL_HOSTELS = [...MALE_HOSTELS, ...FEMALE_HOSTELS]
