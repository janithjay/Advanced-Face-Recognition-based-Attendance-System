import Papa from 'papaparse';

// Key to store student data in localStorage
const STUDENT_DATA_KEY = 'student_registration_data';

/**
 * Manage CSV files in browser's File System Access API
 */
export class StudentCSVManager {
    /**
     * Request permission to access a specific directory for saving CSVs
     * @returns {Promise<FileSystemDirectoryHandle>} Selected directory handle
     */
    static async getOrSelectDirectory() {
        try {
            // Check if we've already stored a directory handle
            const savedHandle = localStorage.getItem('student_csv_directory_handle');
            
            if (savedHandle) {
                try {
                    const handle = await window.showDirectoryPicker({ 
                        id: 'student-csv-directory',
                        mode: 'readwrite'
                    });
                    return handle;
                } catch (error) {
                    // If previous directory is no longer accessible, prompt for new selection
                    localStorage.removeItem('student_csv_directory_handle');
                }
            }

            // Prompt user to select a directory
            const directoryHandle = await window.showDirectoryPicker({
                mode: 'readwrite'
            });

            // Save the directory handle for future use
            localStorage.setItem('student_csv_directory_handle', 'selected');

            return directoryHandle;
        } catch (error) {
            console.error('Error selecting directory:', error);
            throw error;
        }
    }

    /**
     * Save student data to CSV file
     * @param {string} degreeProgram - Degree program of the student
     * @param {object} studentData - Student registration data
     * @returns {Promise<boolean>} - Indicates successful save
     */
    static async saveToCSV(degreeProgram, studentData) {
        try {
            // Get or select directory
            const directoryHandle = await this.getOrSelectDirectory();

            // Prepare filename
            const filename = `${degreeProgram}_students.csv`;

            // Try to get existing file or create new one
            let fileHandle;
            try {
                fileHandle = await directoryHandle.getFileHandle(filename, { create: true });
            } catch (error) {
                console.error('Error getting file handle:', error);
                throw error;
            }

            // Read existing file content
            let existingData = [];
            try {
                const file = await fileHandle.getFile();
                const fileContent = await file.text();
                
                // Parse existing CSV if not empty
                if (fileContent.trim()) {
                    existingData = Papa.parse(fileContent, { 
                        header: true,
                        dynamicTyping: true 
                    }).data;
                }
            } catch (error) {
                console.warn('No existing file or error reading file:', error);
            }

            // Add new student data
            existingData.push(studentData);

            // Convert data to CSV
            const csv = Papa.unparse(existingData);

            // Write to file
            const writable = await fileHandle.createWritable();
            await writable.write(csv);
            await writable.close();

            // Optional: Store in localStorage for additional persistence
            const storedData = JSON.parse(localStorage.getItem(STUDENT_DATA_KEY) || '{}');
            if (!storedData[degreeProgram]) {
                storedData[degreeProgram] = [];
            }
            storedData[degreeProgram].push(studentData);
            localStorage.setItem(STUDENT_DATA_KEY, JSON.stringify(storedData));

            return true;
        } catch (error) {
            console.error('Error saving student data:', error);
            
            // If user cancels directory selection, throw specific error
            if (error.name === 'AbortError') {
                throw new Error('Directory selection cancelled');
            }
            throw error;
        }
    }

    /**
     * Read student data for a specific degree program
     * @param {string} degreeProgram - Degree program to retrieve data for
     * @returns {Promise<Array>} - Array of student data
     */
    static async readFromCSV(degreeProgram) {
        try {
            // Get or select directory
            const directoryHandle = await this.getOrSelectDirectory();

            // Prepare filename
            const filename = `${degreeProgram}_students.csv`;

            // Try to get file
            let fileHandle;
            try {
                fileHandle = await directoryHandle.getFileHandle(filename);
            } catch (error) {
                // If file doesn't exist, return empty array
                if (error.name === 'NotFoundError') {
                    return [];
                }
                throw error;
            }

            // Read file content
            const file = await fileHandle.getFile();
            const fileContent = await file.text();

            // Parse CSV
            const parsedData = Papa.parse(fileContent, { 
                header: true,
                dynamicTyping: true 
            });

            return parsedData.data || [];
        } catch (error) {
            console.error('Error reading student data:', error);
            
            // If user cancels directory selection, throw specific error
            if (error.name === 'AbortError') {
                throw new Error('Directory selection cancelled');
            }
            throw error;
        }
    }

    /**
     * Get total number of students for a degree program
     * @param {string} degreeProgram - Degree program to count students
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
            // Get or select directory
            const directoryHandle = await this.getOrSelectDirectory();

            // Prepare filename
            const filename = `${degreeProgram}_students.csv`;

            // Try to delete file
            try {
                await directoryHandle.removeEntry(filename);
            } catch (error) {
                // If file doesn't exist, it's not an error
                if (error.name !== 'NotFoundError') {
                    throw error;
                }
            }

            // Clear from localStorage
            const storedData = JSON.parse(localStorage.getItem(STUDENT_DATA_KEY) || '{}');
            delete storedData[degreeProgram];
            localStorage.setItem(STUDENT_DATA_KEY, JSON.stringify(storedData));
        } catch (error) {
            console.error('Error clearing data:', error);
            
            // If user cancels directory selection, silently fail
            if (error.name === 'AbortError') {
                return;
            }
            throw error;
        }
    }

    /**
     * Clear all stored student data
     */
    static async clearAllData() {
        try {
            // Get or select directory
            const directoryHandle = await this.getOrSelectDirectory();

            // Attempt to delete all CSV files
            for await (const entry of directoryHandle.values()) {
                if (entry.kind === 'file' && entry.name.endsWith('_students.csv')) {
                    await directoryHandle.removeEntry(entry.name);
                }
            }

            // Clear localStorage
            localStorage.removeItem(STUDENT_DATA_KEY);
        } catch (error) {
            console.error('Error clearing all data:', error);
            
            // If user cancels directory selection, silently fail
            if (error.name === 'AbortError') {
                return;
            }
            throw error;
        }
    }
}

// Export individual functions for easier use
export const saveToCSV = StudentCSVManager.saveToCSV.bind(StudentCSVManager);
export const readFromCSV = StudentCSVManager.readFromCSV.bind(StudentCSVManager);
export const getStudentCount = StudentCSVManager.getStudentCount.bind(StudentCSVManager);
export const clearProgramData = StudentCSVManager.clearProgramData.bind(StudentCSVManager);
export const clearAllData = StudentCSVManager.clearAllData.bind(StudentCSVManager);