from flask import Flask, render_template, request, jsonify
import random
from solve import GraphColoringDSATUR  # Import Class từ file solve.py

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/generate-random', methods=['POST'])
def generate_random():
    """API tạo dữ liệu đồ thị ngẫu nhiên"""
    data = request.json
    try:
        num_nodes = int(data.get('nodes', 10))
        density = float(data.get('density', 0.3))
    except (ValueError, TypeError):
        return jsonify({'error': 'Tham số không hợp lệ'}), 400
    
    nodes = [{'id': i, 'label': str(i)} for i in range(num_nodes)]
    edges = []
    
    # Tạo cạnh ngẫu nhiên (Vô hướng, không khuyên)
    for i in range(num_nodes):
        for j in range(i + 1, num_nodes):
            if random.random() < density:
                edges.append({'from': i, 'to': j})
                
    return jsonify({'nodes': nodes, 'edges': edges})

@app.route('/solve', methods=['POST'])
def solve():
    """API giải thuật toán tô màu"""
    data = request.json
    nodes = data.get('nodes', [])
    edges_data = data.get('edges', [])
    num_colors = int(data.get('num_colors', 3))
    
    # Tìm ID lớn nhất để xác định kích thước ma trận/mảng
    max_id = 0
    if nodes:
        max_id = max(n['id'] for n in nodes)
    
    # Khởi tạo Solver DSATUR
    # Lưu ý: max_id + 1 vì index bắt đầu từ 0
    solver = GraphColoringDSATUR(max_id + 1, edges_data)
    
    # Chạy thuật toán
    success, history = solver.solve(num_colors)
    
    return jsonify({
        'success': success,
        'history': history
    })

if __name__ == '__main__':
    app.run(debug=True)