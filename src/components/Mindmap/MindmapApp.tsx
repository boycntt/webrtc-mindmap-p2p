import React, { useState, useEffect, useRef } from 'react';
import { 
  Trash2, 
  Maximize2, 
  ZoomIn, 
  ZoomOut, 
  Download, 
  Upload, 
  RefreshCw, 
  HelpCircle,
  FolderOpen
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface MindmapNode {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string; // Indigo, Emerald, Amber, Rose, Violet, Cyan
  icon?: string;
  parentId?: string;
}

// Pre-defined Colors
const COLORS = [
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Cyan', value: '#06b6d4' }
];

const EMOJIS = ['💡', '🚀', '🎯', '📚', '💻', '🎨', '⚙️', '🌟', '🔥', '✅'];

// Preloaded template
const TEMPLATE_AI: MindmapNode[] = [
  { id: 'root', text: 'AI & ML Roadmap', x: 200, y: 300, color: '#6366f1', icon: '💡' },
  { id: 'math', text: 'Mathematics', x: 440, y: 150, color: '#10b981', icon: '📚', parentId: 'root' },
  { id: 'stats', text: 'Probability & Stats', x: 680, y: 100, color: '#10b981', parentId: 'math' },
  { id: 'linear', text: 'Linear Algebra', x: 680, y: 200, color: '#10b981', parentId: 'math' },
  { id: 'ml', text: 'Machine Learning', x: 440, y: 300, color: '#f59e0b', icon: '🚀', parentId: 'root' },
  { id: 'supervised', text: 'Supervised Learning', x: 680, y: 280, color: '#f59e0b', parentId: 'ml' },
  { id: 'unsupervised', text: 'Unsupervised Learning', x: 680, y: 360, color: '#f59e0b', parentId: 'ml' },
  { id: 'dl', text: 'Deep Learning', x: 440, y: 450, color: '#8b5cf6', icon: '🔥', parentId: 'root' },
  { id: 'cnn', text: 'Computer Vision', x: 680, y: 420, color: '#8b5cf6', parentId: 'dl' },
  { id: 'nlp', text: 'NLP & Transformers', x: 680, y: 500, color: '#8b5cf6', parentId: 'dl' }
];

const MindmapApp: React.FC = () => {
  const [nodes, setNodes] = useState<MindmapNode[]>(() => {
    const saved = localStorage.getItem('sunhouse-mindmap-nodes');
    return saved ? JSON.parse(saved) : TEMPLATE_AI;
  });

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [isCreatingNode, setIsCreatingNode] = useState(false);

  // Canvas Viewport Pan & Zoom
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 50, y: 50 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const viewportRef = useRef<HTMLDivElement>(null);

  // Node Dragging
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const nodeDragOffset = useRef({ x: 0, y: 0 });

  // Help Modal Toggle
  const [showHelp, setShowHelp] = useState(true);

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem('sunhouse-mindmap-nodes', JSON.stringify(nodes));
  }, [nodes]);

  // Handle Canvas Dragging for Panning
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target === viewportRef.current || (e.target as HTMLElement).classList.contains('mindmap-canvas')) {
      setIsDraggingCanvas(true);
      dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isDraggingCanvas) {
      setPan({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y
      });
    } else if (draggingNodeId) {
      // Scale coordinates based on zoom factor
      const canvasRect = e.currentTarget.getBoundingClientRect();
      const relativeX = (e.clientX - canvasRect.left - pan.x) / zoom;
      const relativeY = (e.clientY - canvasRect.top - pan.y) / zoom;
      
      setNodes(prev => prev.map(node => {
        if (node.id === draggingNodeId) {
          return {
            ...node,
            x: Math.max(20, relativeX - nodeDragOffset.current.x),
            y: Math.max(20, relativeY - nodeDragOffset.current.y)
          };
        }
        return node;
      }));
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDraggingCanvas(false);
    setDraggingNodeId(null);
  };

  const handleCanvasWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = 0.05;
    const nextZoom = e.deltaY < 0 ? zoom + zoomFactor : zoom - zoomFactor;
    setZoom(Math.max(0.3, Math.min(2.5, nextZoom)));
  };

  // Node mouse interactions
  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setSelectedNodeId(nodeId);
    setDraggingNodeId(nodeId);
    
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      const canvasRect = viewportRef.current?.getBoundingClientRect();
      if (canvasRect) {
        const nodeXOnCanvas = node.x;
        const nodeYOnCanvas = node.y;
        
        // Find relative coordinates of mouse on node
        const mouseXOnCanvas = (e.clientX - canvasRect.left - pan.x) / zoom;
        const mouseYOnCanvas = (e.clientY - canvasRect.top - pan.y) / zoom;
        
        nodeDragOffset.current = {
          x: mouseXOnCanvas - nodeXOnCanvas,
          y: mouseYOnCanvas - nodeYOnCanvas
        };
      }
    }
  };

  // Create new sibling node (Enter)
  const addSiblingNode = (targetId: string) => {
    const targetNode = nodes.find(n => n.id === targetId);
    if (!targetNode) return;

    // Sibling shares the parentId
    const parentId = targetNode.parentId;
    const siblingId = 'node_' + Math.random().toString(36).substr(2, 9);
    
    // Position below the target node
    const newY = targetNode.y + 80;
    const newX = targetNode.x;

    const newNode: MindmapNode = {
      id: siblingId,
      text: '', // Start empty to trigger cancellation check
      x: newX,
      y: newY,
      color: targetNode.color,
      parentId: parentId
    };

    setNodes(prev => [...prev, newNode]);
    setSelectedNodeId(siblingId);
    setEditingNodeId(siblingId);
    setEditText('');
    setIsCreatingNode(true);
  };

  // Create new child node (Tab)
  const addChildNode = (targetId: string) => {
    const parentNode = nodes.find(n => n.id === targetId);
    if (!parentNode) return;

    const childId = 'node_' + Math.random().toString(36).substr(2, 9);
    
    // Position to the right of parent
    const newX = parentNode.x + 240;
    
    // Calculate vertical offset based on existing children
    const siblings = nodes.filter(n => n.parentId === targetId);
    const offset = siblings.length * 80;
    const newY = parentNode.y + offset - (siblings.length * 30);

    const newNode: MindmapNode = {
      id: childId,
      text: '', // Start empty to trigger cancellation check
      x: newX,
      y: newY,
      color: parentNode.color,
      parentId: targetId
    };

    setNodes(prev => [...prev, newNode]);
    setSelectedNodeId(childId);
    setEditingNodeId(childId);
    setEditText('');
    setIsCreatingNode(true);
  };

  // Finish editing text
  const finishEditingNode = (discardIfUnmodified = false) => {
    if (!editingNodeId) return;

    const trimmed = editText.trim();
    
    if (discardIfUnmodified && (trimmed === '' || trimmed === 'Nhánh con' || trimmed === 'Nhánh mới')) {
      // Discard/Remove node if it was newly created and not modified
      if (isCreatingNode) {
        setNodes(prev => prev.filter(n => n.id !== editingNodeId));
        setSelectedNodeId(null);
      }
    } else {
      // Update text
      setNodes(prev => prev.map(node => {
        if (node.id === editingNodeId) {
          return { ...node, text: trimmed || 'Node' };
        }
        return node;
      }));
    }

    setEditingNodeId(null);
    setIsCreatingNode(false);
  };

  const handleNodeDoubleClick = (node: MindmapNode) => {
    setEditingNodeId(node.id);
    setEditText(node.text);
  };

  // Handle Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcut key handlers if user is currently editing text inside input
      if (editingNodeId) {
        if (e.key === 'Enter') {
          finishEditingNode(true);
        } else if (e.key === 'Escape') {
          // Cancel edit entirely and discard if newly created
          if (isCreatingNode) {
            setNodes(prev => prev.filter(n => n.id !== editingNodeId));
            setSelectedNodeId(null);
          }
          setEditingNodeId(null);
          setIsCreatingNode(false);
        }
        return;
      }

      if (!selectedNodeId) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        addSiblingNode(selectedNodeId);
      } else if (e.key === 'Tab') {
        e.preventDefault();
        addChildNode(selectedNodeId);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        // Delete node and its subtree recursively
        if (selectedNodeId !== 'root') {
          deleteNodeRecursive(selectedNodeId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, editingNodeId, editText, nodes, isCreatingNode]);

  // Recursively delete nodes
  const deleteNodeRecursive = (nodeId: string) => {
    let idsToDelete = new Set([nodeId]);
    let active = true;

    while (active) {
      const childNodes = nodes.filter(n => n.parentId && idsToDelete.has(n.parentId) && !idsToDelete.has(n.id));
      if (childNodes.length === 0) {
        active = false;
      } else {
        childNodes.forEach(c => idsToDelete.add(c.id));
      }
    }

    setNodes(prev => prev.filter(n => !idsToDelete.has(n.id)));
    setSelectedNodeId(null);
  };

  // Auto Layout Nodes Left to Right
  const handleAutoLayout = () => {
    const layoutHelper = (nodeId: string, currentX: number, minY: number): { nextMinY: number; nodeY: number } => {
      const children = nodes.filter(n => n.parentId === nodeId);
      if (children.length === 0) {
        return { nextMinY: minY + 80, nodeY: minY };
      }

      let currentMinY = minY;
      let childrenYs: number[] = [];

      children.forEach(child => {
        const res = layoutHelper(child.id, currentX + 240, currentMinY);
        childrenYs.push(res.nodeY);
        currentMinY = res.nextMinY;
        
        // Update child position in real-time
        setNodes(prev => prev.map(n => {
          if (n.id === child.id) {
            return { ...n, x: currentX + 240, y: res.nodeY };
          }
          return n;
        }));
      });

      // Position current node in the center of its children
      const avgY = childrenYs.reduce((a, b) => a + b, 0) / childrenYs.length;
      return { nextMinY: currentMinY, nodeY: avgY };
    };

    // Position root node
    setNodes(prev => prev.map(n => {
      if (n.id === 'root') {
        return { ...n, x: 150, y: 300 };
      }
      return n;
    }));

    layoutHelper('root', 150, 80);
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.8 } });
  };

  // Change Node Colors
  const handleColorChange = (colorValue: string) => {
    if (!selectedNodeId) return;
    setNodes(prev => prev.map(node => {
      if (node.id === selectedNodeId) {
        return { ...node, color: colorValue };
      }
      return node;
    }));
  };

  // Change Node Emojis/Icons
  const handleIconChange = (emoji: string) => {
    if (!selectedNodeId) return;
    setNodes(prev => prev.map(node => {
      if (node.id === selectedNodeId) {
        return { ...node, icon: node.icon === emoji ? undefined : emoji };
      }
      return node;
    }));
  };

  // Reset to default roadmap template
  const handleResetTemplate = () => {
    setNodes(TEMPLATE_AI);
    setSelectedNodeId(null);
    setPan({ x: 50, y: 50 });
    setZoom(1);
  };

  // Export Mindmap config as JSON file
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(nodes, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "sunhouse_mindmap.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import Mindmap from JSON
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileReader = new FileReader();
    fileReader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id) {
          setNodes(parsed);
          setSelectedNodeId(null);
        }
      } catch (err) {
        alert('Định dạng file JSON không hợp lệ!');
      }
    };
    fileReader.readAsText(files[0]);
  };

  return (
    <div className="mindmap-wrapper">
      {/* Dynamic Floating Toolbar */}
      <div className="mindmap-toolbar">
        <div className="toolbar-group">
          <button 
            type="button" 
            className="sidebar-toggle-btn"
            title="Auto Layout (Lắp đặt tự động)" 
            onClick={handleAutoLayout}
          >
            <RefreshCw size={16} />
          </button>
          
          <button 
            type="button" 
            className="sidebar-toggle-btn"
            title="Reset template mặc định" 
            onClick={handleResetTemplate}
          >
            <FolderOpen size={16} />
          </button>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-group">
          <button 
            type="button" 
            className="sidebar-toggle-btn" 
            onClick={() => setZoom(z => Math.max(0.3, z - 0.1))}
            title="Zoom Out"
          >
            <ZoomOut size={16} />
          </button>
          <span style={{ fontSize: '0.75rem', width: '32px', textAlign: 'center', fontWeight: 600 }}>
            {Math.round(zoom * 100)}%
          </span>
          <button 
            type="button" 
            className="sidebar-toggle-btn" 
            onClick={() => setZoom(z => Math.min(2.5, z + 0.1))}
            title="Zoom In"
          >
            <ZoomIn size={16} />
          </button>
          <button 
            type="button" 
            className="sidebar-toggle-btn" 
            onClick={() => { setZoom(1); setPan({ x: 50, y: 50 }); }}
            title="Reset View"
          >
            <Maximize2 size={16} />
          </button>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-group">
          <button 
            type="button" 
            className="sidebar-toggle-btn" 
            onClick={handleExportJSON}
            title="Export JSON"
          >
            <Download size={16} />
          </button>
          
          <label className="sidebar-toggle-btn" title="Import JSON" style={{ cursor: 'pointer' }}>
            <Upload size={16} />
            <input 
              type="file" 
              accept=".json" 
              onChange={handleImportJSON} 
              style={{ display: 'none' }} 
            />
          </label>

          <button 
            type="button" 
            className="sidebar-toggle-btn" 
            onClick={() => setShowHelp(!showHelp)}
            title="Show Guide"
          >
            <HelpCircle size={16} style={{ color: showHelp ? '#6366f1' : 'inherit' }} />
          </button>
        </div>
      </div>

      {/* Interactive Dragging Canvas Viewport */}
      <div 
        className="mindmap-viewport" 
        ref={viewportRef}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onWheel={handleCanvasWheel}
      >
        <div 
          className="mindmap-canvas"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          {/* SVG Connector Lines */}
          <svg className="mindmap-svg-overlay">
            {nodes.map(node => {
              if (!node.parentId) return null;
              const parent = nodes.find(n => n.id === node.parentId);
              if (!parent) return null;

              // Calculate start and end coordinates based on Left-to-Right orientation
              // Nodes widths are around 150px, height around 45px
              const startX = parent.x + 140; 
              const startY = parent.y + 20;
              const endX = node.x;
              const endY = node.y + 20;

              // Smooth Cubic Bezier horizontal curve matching Left-to-Right layout
              const controlX1 = startX + 80;
              const controlY1 = startY;
              const controlX2 = endX - 80;
              const controlY2 = endY;

              const isLineActive = selectedNodeId === node.id || selectedNodeId === parent.id;

              return (
                <path
                  key={`line_${node.id}`}
                  className={`connector-line ${isLineActive ? 'active' : ''}`}
                  d={`M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`}
                  style={{ stroke: isLineActive ? node.color : undefined }}
                />
              );
            })}
          </svg>

          {/* Render Mindmap Nodes */}
          {nodes.map(node => {
            const isSelected = selectedNodeId === node.id;
            const isEditing = editingNodeId === node.id;
            const isRoot = node.id === 'root';

            return (
              <div
                key={node.id}
                className={`mindmap-node-card ${isRoot ? 'root-node' : ''} ${isSelected ? 'selected-node' : ''}`}
                style={{
                  left: node.x,
                  top: node.y,
                  borderLeft: `4px solid ${node.color}`
                }}
                onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                onDoubleClick={() => handleNodeDoubleClick(node)}
              >
                {/* Node icon (emoji indicator) */}
                {node.icon && <span className="node-icon-indicator">{node.icon}</span>}

                {/* Edit Input or Text Label display */}
                {isEditing ? (
                  <input
                    type="text"
                    className="node-input-edit"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onBlur={() => finishEditingNode(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') finishEditingNode(true);
                      if (e.key === 'Escape') {
                        e.stopPropagation();
                        // Revert newly created node
                        if (isCreatingNode) {
                          setNodes(prev => prev.filter(n => n.id !== editingNodeId));
                          setSelectedNodeId(null);
                        }
                        setEditingNodeId(null);
                        setIsCreatingNode(false);
                      }
                    }}
                    autoFocus
                  />
                ) : (
                  <span className="node-text-display">
                    {node.text || 'Nhấp đúp để đặt tên'}
                  </span>
                )}

                {/* Selected Node Control options */}
                {isSelected && !isEditing && (
                  <div className="node-options-popover" onMouseDown={e => e.stopPropagation()}>
                    {/* Emoji Selectors */}
                    {EMOJIS.map(emoji => (
                      <button 
                        key={emoji}
                        type="button"
                        className="reaction-emoji-btn"
                        onClick={() => handleIconChange(emoji)}
                        style={{ fontSize: '0.85rem', padding: '1px' }}
                      >
                        {emoji}
                      </button>
                    ))}
                    <div style={{ width: '1px', background: 'var(--border)', margin: '0 4px' }} />
                    {/* Color Selectors */}
                    {COLORS.map(c => (
                      <div
                        key={c.name}
                        className="color-option"
                        style={{ backgroundColor: c.value }}
                        onClick={() => handleColorChange(c.value)}
                        title={c.name}
                      />
                    ))}
                    {!isRoot && (
                      <>
                        <div style={{ width: '1px', background: 'var(--border)', margin: '0 4px' }} />
                        <button
                          type="button"
                          className="sidebar-toggle-btn"
                          style={{ padding: '2px', color: 'var(--danger)' }}
                          onClick={() => deleteNodeRecursive(node.id)}
                          title="Xóa nhánh"
                        >
                          <Trash2 size={12} />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Keyboard Guide Panel */}
      {showHelp && (
        <div className="mindmap-help-card">
          <div className="help-title">Bảng Hướng Dẫn Sử Dụng</div>
          <div className="help-item">
            <span>Tạo nhánh con (bên phải):</span>
            <span className="help-key">Tab</span>
          </div>
          <div className="help-item">
            <span>Tạo nhánh cùng cấp:</span>
            <span className="help-key">Enter</span>
          </div>
          <div className="help-item">
            <span>Xoá nhánh đã chọn:</span>
            <span className="help-key">Del / Backspace</span>
          </div>
          <div className="help-item">
            <span>Đổi tên nhánh:</span>
            <span>Nhấp đúp chuột</span>
          </div>
          <div className="help-item">
            <span>Huỷ tạo nếu trống:</span>
            <span>Click ngoài / Esc</span>
          </div>
          <div className="help-item">
            <span>Di chuyển Canvas:</span>
            <span>Kéo thả nền</span>
          </div>
          <div className="help-item">
            <span>Phóng to / thu nhỏ:</span>
            <span>Cuộn chuột</span>
          </div>
          <button 
            type="button"
            className="sidebar-toggle-btn"
            style={{ width: '100%', marginTop: '12px', fontSize: '0.78rem', justifyContent: 'center', background: 'var(--bg-input)' }}
            onClick={() => setShowHelp(false)}
          >
            Đã hiểu
          </button>
        </div>
      )}
    </div>
  );
};

export default MindmapApp;
