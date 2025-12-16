from typing import List, Tuple, Dict, Optional, Set

class GraphColoringDSATUR:
    """
    Lớp giải quyết bài toán tô màu đồ thị sử dụng thuật toán DSATUR 
    (Degree of Saturation) kết hợp với Backtracking.
    """

    def __init__(self, num_nodes: int, edges: List[Dict[str, int]]):
        """
        Khởi tạo đồ thị và các cấu trúc dữ liệu cần thiết.
        
        :param num_nodes: Số lượng đỉnh (Nodes).
        :param edges: Danh sách cạnh dưới dạng [{'from': u, 'to': v}, ...].
        """
        self.num_nodes = num_nodes
        self.adj_list: List[List[int]] = [[] for _ in range(num_nodes)]
        self.degrees: List[int] = [0] * num_nodes
        self.history: List[Dict] = []
        
        # Xây dựng đồ thị và tính bậc (Degree)
        self._build_graph(edges)

    def _build_graph(self, edges: List[Dict[str, int]]) -> None:
        """Chuyển đổi danh sách cạnh thành danh sách kề và tính bậc."""
        for edge in edges:
            u, v = edge['from'], edge['to']
            if 0 <= u < self.num_nodes and 0 <= v < self.num_nodes:
                self.adj_list[u].append(v)
                self.adj_list[v].append(u)
        
        # Tính bậc cho từng đỉnh (Pre-calculation)
        for i in range(self.num_nodes):
            self.degrees[i] = len(self.adj_list[i])

    def _is_safe(self, node: int, colors: List[int], color_check: int) -> bool:
        """
        Kiểm tra xem tô màu 'color_check' cho đỉnh 'node' có hợp lệ không.
        Sử dụng hàm any() để tối ưu tốc độ và ngắn gọn.
        """
        # Nếu có bất kỳ hàng xóm nào trùng màu -> Không an toàn
        return not any(colors[neighbor] == color_check for neighbor in self.adj_list[node])

    def _get_saturation(self, node: int, colors: List[int]) -> int:
        """
        Tính độ bão hòa: Số lượng màu ĐÃ DÙNG KHÁC NHAU ở các đỉnh hàng xóm.
        """
        used_colors = {colors[neighbor] for neighbor in self.adj_list[node] if colors[neighbor] != 0}
        return len(used_colors)

    def _get_next_node(self, colors: List[int]) -> Optional[int]:
        """
        Chọn đỉnh tiếp theo theo chuẩn DSATUR:
        1. Saturation cao nhất.
        2. Degree cao nhất (Tie-break).
        3. Index nhỏ nhất (Tie-break tự động của hàm max).
        """
        # Lọc ra các đỉnh chưa được tô màu (màu 0)
        uncolored_nodes = [v for v in range(self.num_nodes) if colors[v] == 0]

        if not uncolored_nodes:
            return None

        # Tối ưu hóa logic so sánh bằng Key Function
        # Python so sánh Tuple theo thứ tự: (Saturation, Degree)
        # Hàm max sẽ trả về phần tử có tuple lớn nhất.
        return max(
            uncolored_nodes, 
            key=lambda v: (self._get_saturation(v, colors), self.degrees[v])
        )

    def _log_step(self, node: int, color: int, action: str) -> None:
        """Ghi lại lịch sử bước đi để Frontend hiển thị."""
        self.history.append({
            'node': node,
            'color_index': color,
            'action': action
        })

    def _backtrack(self, max_colors: int, colors: List[int]) -> bool:
        """Hàm đệ quy thực hiện thuật toán Backtracking."""
        
        # 1. Chọn đỉnh tốt nhất theo heuristic DSATUR
        node = self._get_next_node(colors)

        # Base case: Nếu không còn đỉnh nào chưa tô -> Thành công
        if node is None:
            return True

        # 2. Thử các màu từ 1 đến max_colors
        for color in range(1, max_colors + 1):
            if self._is_safe(node, colors, color):
                # Action: Tô màu
                colors[node] = color
                self._log_step(node, color, 'try')

                # Recursive call
                if self._backtrack(max_colors, colors):
                    return True

                # Backtrack: Xóa màu
                colors[node] = 0
                self._log_step(node, 0, 'backtrack')

        return False

    def solve(self, num_colors: int) -> Tuple[bool, List[Dict]]:
        """
        Phương thức public duy nhất để gọi thuật toán.
        :return: (Trạng thái thành công, Lịch sử các bước)
        """
        # Reset trạng thái
        colors = [0] * self.num_nodes
        self.history = []

        # Bắt đầu thuật toán
        success = self._backtrack(num_colors, colors)
        
        return success, self.history