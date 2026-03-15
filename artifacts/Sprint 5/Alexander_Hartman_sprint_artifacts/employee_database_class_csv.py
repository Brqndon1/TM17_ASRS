import csv

class EmployeeDatabase:

    ## I just used what the JSON file does and changed as needed
    def __init__(self, FILE_PATH="employee_records_DB.csv"):
        """Initialize by ensuring the CSV file exists."""
        self.FILE_PATH = FILE_PATH
        try:
            with open(self.FILE_PATH, "r") as file:
                pass  # File exists
        except FileNotFoundError:
            # Create empty CSV file with header if it doesn't exist
            with open(self.FILE_PATH, "w", newline='') as file:
                writer = csv.writer(file)
                writer.writerow(["id", "first_name", "last_name", "birthdate", "hire_date", "job_title"])  # Header

    def read_csv(self):
        """Read and return data from the CSV file."""
        with open(self.FILE_PATH, "r") as file:
            reader = csv.DictReader(file)
            return list(reader)
        
    def write_csv(self, data):
        """Write data to the CSV file."""
        with open(self.FILE_PATH, "w", newline='') as file:
            writer = csv.DictWriter(file, fieldnames=["id", "first_name", "last_name", "birthdate", "hire_date", "job_title"])
            writer.writeheader()
            writer.writerows(data)
        
    def insert_employee(self, first_name, last_name, birthdate, hire_date, job_title):
        """Insert a new employee into the CSV file."""
        reader = self.read_csv() 
        employee_id = len(reader) + 1  # Auto-increment ID
        new_employee = {
            "id": employee_id,
            "first_name": first_name,
            "last_name": last_name,
            "birthdate": birthdate,
            "hire_date": hire_date,
            "job_title": job_title
        }
        reader.append(new_employee)
        self.write_csv(reader)

    def get_employee(self, first_name, last_name):
        """Retrieve a specific employee by name."""
        with open(self.FILE_PATH, "r") as file:
            reader = csv.DictReader(file)
            for row in reader:
                if row["first_name"] == first_name and row["last_name"] == last_name:
                    return \
                    "ID: " + str(row['id']) + ", " + \
                    "Name: " + row['first_name'] + " " + row['last_name'] + ", " \
                    "Birthdate: " + str(row['birthdate']) + ", " + \
                    "Hire Date: " + str(row['hire_date']) + ", " + \
                    "Job Title: " + str(row['job_title'])
                
        return None 
    
    def get_all_employees(self):
        """Retrieve all employees."""
        with open(self.FILE_PATH, "r") as file:
            reader = csv.DictReader(file)
            return list(reader)