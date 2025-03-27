import Papa from 'papaparse';

/**
 * Manage CSV files in the browser's Origin Private File System (OPFS)
 */
export class StudentCSVManager {
  /**
   * Save student data to a CSV file in the "students_data" directory within OPFS
   * @param {string} degreeProgram - Degree program of the student
   * @param {object} studentData - Student registration data
   * @returns {Promise<boolean>} - Indicates successful save
   */
  static async saveToCSV(degreeProgram, studentData) {
    try {
      const root = await navigator.storage.getDirectory();
      const studentsDataDir = await root.getDirectoryHandle('students_data', { create: true });
      const filename = `${degreeProgram.toLowerCase().replace(/\s+/g, '_')}_students.csv`;
      const fileHandle = await studentsDataDir.getFileHandle(filename, { create: true });

      let existingData = [];
      try {
        const file = await fileHandle.getFile();
        const fileContent = await file.text();
        if (fileContent.trim()) {
          existingData = Papa.parse(fileContent, { header: true, dynamicTyping: true }).data;
        }
      } catch (error) {
        console.warn('No existing file or error reading file:', error);
      }

      existingData.push(studentData);
      const csv = Papa.unparse(existingData);
      const writable = await fileHandle.createWritable();
      await writable.write(csv);
      await writable.close();
      return true;
    } catch (error) {
      console.error('Error saving student data:', error);
      throw error;
    }
  }

  /**
   * Read student data for a specific degree program from the "students_data" directory in OPFS
   * @param {string} degreeProgram - Degree program to retrieve data for
   * @returns {Promise<Array>} - Array of student data
   */
  static async readFromCSV(degreeProgram) {
    try {
      const root = await navigator.storage.getDirectory();
      const studentsDataDir = await root.getDirectoryHandle('students_data');
      const filename = `${degreeProgram.toLowerCase().replace(/\s+/g, '_')}_students.csv`;
      let fileHandle;
      try {
        fileHandle = await studentsDataDir.getFileHandle(filename);
      } catch (error) {
        if (error.name === 'NotFoundError') {
          return [];
        }
        throw error;
      }
      const file = await fileHandle.getFile();
      const fileContent = await file.text();
      const parsedData = Papa.parse(fileContent, { header: true, dynamicTyping: true });
      return parsedData.data || [];
    } catch (error) {
      console.error('Error reading student data:', error);
      throw error;
    }
  }

  /**
   * Read attendance data for a specific date from the "attendance_data" directory in OPFS
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Promise<Array>} - Array of attendance records
   */
  static async readAttendanceFromCSV(date) {
    try {
      const root = await navigator.storage.getDirectory();
      const attendanceDataDir = await root.getDirectoryHandle('attendance_data', { create: true });
      const filename = `attendance_${date}.csv`;
      let fileHandle;
      try {
        fileHandle = await attendanceDataDir.getFileHandle(filename);
      } catch (error) {
        if (error.name === 'NotFoundError') {
          return []; // File doesn't exist, return empty array
        }
        throw error;
      }
      const file = await fileHandle.getFile();
      const fileContent = await file.text();
      const parsedData = Papa.parse(fileContent, { header: true, dynamicTyping: true });
      return parsedData.data || [];
    } catch (error) {
      console.error('Error reading attendance data:', error);
      throw error;
    }
  }

  /**
   * Get the total number of students for a degree program
   * @param {string} degreeProgram - Degree program to count students for
   * @returns {Promise<number>} - Number of students
   */
  static async getStudentCount(degreeProgram) {
    try {
      const students = await this.readFromCSV(degreeProgram);
      return students.length;
    } catch (error) {
      console.error('Error getting student count:', error);
      return 0;
    }
  }

  /**
   * Clear all stored student data for a specific degree program
   * @param {string} degreeProgram - Degree program to clear
   */
  static async clearProgramData(degreeProgram) {
    try {
      const root = await navigator.storage.getDirectory();
      const studentsDataDir = await root.getDirectoryHandle('students_data');
      const filename = `${degreeProgram.toLowerCase().replace(/\s+/g, '_')}_students.csv`;
      await studentsDataDir.removeEntry(filename);
    } catch (error) {
      console.error('Error clearing data:', error);
      if (error.name !== 'NotFoundError') {
        throw error;
      }
    }
  }

  /**
   * Clear all stored student data
   */
  static async clearAllData() {
    try {
      const root = await navigator.storage.getDirectory();
      await root.removeEntry('students_data', { recursive: true });
    } catch (error) {
      console.error('Error clearing all data:', error);
      if (error.name !== 'NotFoundError') {
        throw error;
      }
    }
  }
}

// Export individual functions for easier use
export const saveToCSV = StudentCSVManager.saveToCSV.bind(StudentCSVManager);
export const readFromCSV = StudentCSVManager.readFromCSV.bind(StudentCSVManager);
export const readAttendanceFromCSV = StudentCSVManager.readAttendanceFromCSV.bind(StudentCSVManager);
export const getStudentCount = StudentCSVManager.getStudentCount.bind(StudentCSVManager);
export const clearProgramData = StudentCSVManager.clearProgramData.bind(StudentCSVManager);
export const clearAllData = StudentCSVManager.clearAllData.bind(StudentCSVManager);