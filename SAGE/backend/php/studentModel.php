<?php
// models/Student.php
class Student {
    private $conn;
    private $table_name = "students";

    public $id;
    public $nome;
    public $cpf;
    public $email;
    public $telefone;
    public $data_nascimento;
    public $endereco;
    public $responsavel;
    public $telefone_responsavel;
    public $responsavel_falecido;
    public $created_by;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function create() {
        $query = "INSERT INTO " . $this->table_name . 
                 " SET nome=:nome, cpf=:cpf, email=:email, telefone=:telefone, 
                  data_nascimento=:data_nascimento, endereco=:endereco, 
                  responsavel=:responsavel, telefone_responsavel=:telefone_responsavel, 
                  responsavel_falecido=:responsavel_falecido, created_by=:created_by";
        
        $stmt = $this->conn->prepare($query);
        
        $stmt->bindParam(':nome', $this->nome);
        $stmt->bindParam(':cpf', $this->cpf);
        $stmt->bindParam(':email', $this->email);
        $stmt->bindParam(':telefone', $this->telefone);
        $stmt->bindParam(':data_nascimento', $this->data_nascimento);
        $stmt->bindParam(':endereco', $this->endereco);
        $stmt->bindParam(':responsavel', $this->responsavel);
        $stmt->bindParam(':telefone_responsavel', $this->telefone_responsavel);
        $stmt->bindParam(':responsavel_falecido', $this->responsavel_falecido);
        $stmt->bindParam(':created_by', $this->created_by);
        
        if($stmt->execute()) {
            $this->id = $this->conn->lastInsertId();
            $this->logAudit('CREATE');
            return true;
        }
        return false;
    }

    public function getAll() {
        $query = "SELECT * FROM " . $this->table_name . " WHERE is_active = 1 ORDER BY nome";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function search($filters) {
        $query = "SELECT * FROM " . $this->table_name . " WHERE is_active = 1";
        $params = [];
        
        if(!empty($filters['nome'])) {
            $query .= " AND nome LIKE :nome";
            $params[':nome'] = '%' . $filters['nome'] . '%';
        }
        if(!empty($filters['cpf'])) {
            $query .= " AND cpf LIKE :cpf";
            $params[':cpf'] = '%' . $filters['cpf'] . '%';
        }
        if(!empty($filters['responsavel'])) {
            $query .= " AND responsavel LIKE :responsavel";
            $params[':responsavel'] = '%' . $filters['responsavel'] . '%';
        }
        if(!empty($filters['data_nascimento'])) {
            $query .= " AND data_nascimento = :data_nascimento";
            $params[':data_nascimento'] = $filters['data_nascimento'];
        }
        
        $query .= " ORDER BY nome";
        $stmt = $this->conn->prepare($query);
        
        foreach($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function update() {
        $query = "UPDATE " . $this->table_name . 
                 " SET nome=:nome, email=:email, telefone=:telefone, 
                  endereco=:endereco, responsavel=:responsavel, 
                  telefone_responsavel=:telefone_responsavel, 
                  responsavel_falecido=:responsavel_falecido 
                  WHERE id = :id AND is_active = 1";
        
        $stmt = $this->conn->prepare($query);
        
        $stmt->bindParam(':nome', $this->nome);
        $stmt->bindParam(':email', $this->email);
        $stmt->bindParam(':telefone', $this->telefone);
        $stmt->bindParam(':endereco', $this->endereco);
        $stmt->bindParam(':responsavel', $this->responsavel);
        $stmt->bindParam(':telefone_responsavel', $this->telefone_responsavel);
        $stmt->bindParam(':responsavel_falecido', $this->responsavel_falecido);
        $stmt->bindParam(':id', $this->id);
        
        if($stmt->execute()) {
            $this->logAudit('UPDATE');
            return true;
        }
        return false;
    }

    public function delete() {
        $query = "UPDATE " . $this->table_name . " SET is_active = 0 WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $this->id);
        
        if($stmt->execute()) {
            $this->logAudit('DELETE');
            return true;
        }
        return false;
    }

    private function logAudit($action) {
        $query = "INSERT INTO audit_log (user_id, action, table_name, record_id) 
                  VALUES (:user_id, :action, :table_name, :record_id)";
        $stmt = $this->conn->prepare($query);
        
        $user_id = isset($_SESSION['user_id']) ? $_SESSION['user_id'] : null;
        $table_name = $this->table_name;
        
        $stmt->bindParam(':user_id', $user_id);
        $stmt->bindParam(':action', $action);
        $stmt->bindParam(':table_name', $table_name);
        $stmt->bindParam(':record_id', $this->id);
        $stmt->execute();
    }
}
?>