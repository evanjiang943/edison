// Auth utility functions
export const getToken = () => localStorage.getItem('token');

export const getUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

export const setAuth = (token, user) => {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
};

export const clearAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

export const isAuthenticated = () => {
  const token = getToken();
  const user = getUser();
  return !!(token && user);
};

export const hasRole = (role) => {
  const user = getUser();
  return user?.role === role;
};

export const isInstructor = () => hasRole('instructor');
export const isTA = () => hasRole('ta');
export const isStudent = () => hasRole('student');
export const canGrade = () => isInstructor() || isTA();
