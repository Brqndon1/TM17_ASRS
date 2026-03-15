import pytest
from employee_database_class_csv import EmployeeDatabase as CSVEmployeeDatabase
from employee_database_class_json import EmployeeDatabase as JSONEmployeeDatabase

#I only test on JSON and CSV because SQL is NOT the same output! Get employee for no employee doesn't return None!

@pytest.fixture
def json_db(tmp_path):
    yield JSONEmployeeDatabase(FILE_PATH=str(tmp_path / "test_employees.json"))

@pytest.fixture
def csv_db(tmp_path):
    yield CSVEmployeeDatabase(FILE_PATH=str(tmp_path / "test_employees.csv"))

@pytest.fixture(params=["json", "csv"])
def db(request, json_db, csv_db):
    return {"json": json_db, "csv": csv_db}[request.param]


#insert and retrieve a single employee test
def test_insert_and_get_employee(db):
    db.insert_employee("Jane", "Doe", "1990-06-15", "2020-03-01", "Engineer")

    result = db.get_employee("Jane", "Doe")

    assert result is not None, "Returned None for a employee that actually exists"
    assert "Name: Jane Doe"         in result, "Full name is incorrect"
    assert "Birthdate: 1990-06-15"  in result, "Birthdate is incorrect"
    assert "Hire Date: 2020-03-01"  in result, "Hire date is incorrect"
    assert "Job Title: Engineer"    in result, "Job title is incorrect"


#Get all employees test
EMPLOYEES = [
    ("Alice", "Smith",    "1985-04-22", "2018-07-10", "Manager"),
    ("Bob",   "Jones",    "1992-11-03", "2021-01-15", "Analyst"),
    ("Carol", "Williams", "1988-09-30", "2015-05-20", "Director"),
]

def test_insert_multiple_and_get_all(db):
    for emp in EMPLOYEES:
        db.insert_employee(*emp)

    all_employees = db.get_all_employees()

    assert len(all_employees) == len(EMPLOYEES), (
        f"Expected {len(EMPLOYEES)} records, got {len(all_employees)}"
    )

    for (first, last, birthdate, hire_date, job_title), record in zip(EMPLOYEES, all_employees):
        assert record["first_name"] == first
        assert record["last_name"]  == last
        assert record["birthdate"]  == birthdate
        assert record["hire_date"]  == hire_date
        assert record["job_title"]  == job_title


#test for seeing if it returns none for an employee that doesn't exist
def test_get_nonexistent_employee_returns_none(db):

    result = db.get_employee("I don't", "Exist")

    assert result is None, (
        "get_employee must return None for an employee that does not exist"
    )