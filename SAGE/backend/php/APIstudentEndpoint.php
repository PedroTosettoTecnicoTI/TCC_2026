<?php
// api/students.php - Student management endpoints
session_start();
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

require_once '../config/database.php';
require_once '../models/Student.php';

// Check authentication
if(!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit();
}

$database = new Database();
$db = $database->getConnection();
$student = new Student($db);

$method = $_SERVER['REQUEST_METHOD'];

if($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"));
    
    // Create student
    if(isset($data->action) && $data->action === 'create') {
        $student->nome = $data->nome;
        $student->cpf = $data->cpf;
        $student->email = $data->email;
        $student->telefone = $data->telefone;
        $student->data_nascimento = $data->data_nascimento;
        $student->endereco = $data->endereco;
        $student->responsavel = $data->responsavel;
        $student->telefone_responsavel = $data->telefone_responsavel;
        $student->responsavel_falecido = $data->responsavel_falecido;
        $student->created_by = $_SESSION['user_id'];
        
        if($student->create()) {
            echo json_encode(['success' => true, 'message' => 'Student created successfully', 'id' => $student->id]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to create student']);
        }
    }
    
    // Search students
    elseif(isset($data->action) && $data->action === 'search') {
        $filters = [];
        if(isset($data->nome)) $filters['nome'] = $data->nome;
        if(isset($data->cpf)) $filters['cpf'] = $data->cpf;
        if(isset($data->responsavel)) $filters['responsavel'] = $data->responsavel;
        if(isset($data->data_nascimento)) $filters['data_nascimento'] = $data->data_nascimento;
        
        $results = $student->search($filters);
        echo json_encode(['success' => true, 'data' => $results]);
    }
    
    // Update student
    elseif(isset($data->action) && $data->action === 'update') {
        $student->id = $data->id;
        $student->nome = $data->nome;
        $student->email = $data->email;
        $student->telefone = $data->telefone;
        $student->endereco = $data->endereco;
        $student->responsavel = $data->responsavel;
        $student->telefone_responsavel = $data->telefone_responsavel;
        $student->responsavel_falecido = $data->responsavel_falecido;
        
        if($student->update()) {
            echo json_encode(['success' => true, 'message' => 'Student updated successfully']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to update student']);
        }
    }
}

if($method === 'GET') {
    // Get all students
    if(isset($_GET['action']) && $_GET['action'] === 'getAll') {
        $students = $student->getAll();
        echo json_encode(['success' => true, 'data' => $students]);
    }
}

if($method === 'DELETE') {
    $data = json_decode(file_get_contents("php://input"));
    
    if(isset($data->id)) {
        $student->id = $data->id;
        if($student->delete()) {
            echo json_encode(['success' => true, 'message' => 'Student deleted successfully']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to delete student']);
        }
    }
}
?>