import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Play, 
  Pause, 
  Sparkles, 
  Info
} from 'lucide-react';

export const ObsidianBrainGraph = ({
  boards = [],
  searchQuery = '',
  priorityFilter = 'all',
  onSelectProject,
  onSelectTask,
  onCreateProject
}) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Simulation state refs (mutable inside requestAnimationFrame for 60fps)
  const nodesRef = useRef([]);
  const edgesRef = useRef([]);
  const particlesRef = useRef([]);
  const animFrameIdRef = useRef(null);

  // Camera transform: pan & zoom
  const cameraRef = useRef({ x: 0, y: 0, scale: 1 });
  const [isPhysicsRunning, setIsPhysicsRunning] = useState(true);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [showLegend, setShowLegend] = useState(false);

  // Drag interaction state
  const dragRef = useRef({
    isDraggingCanvas: false,
    draggedNode: null,
    startX: 0,
    startY: 0,
    cameraStartX: 0,
    cameraStartY: 0,
    touchDist: 0
  });

  // Calculate high-level stats for HUD
  const allProjects = boards || [];
  const allTasks = allProjects.flatMap(b => (b.columns || []).flatMap(c => c.tasks || []));
  const doneTasks = allProjects.flatMap(b =>
    (b.columns || [])
      .filter(c => c.name.toLowerCase().includes('selesai') || c.name.toLowerCase().includes('done'))
      .flatMap(c => c.tasks || [])
  );
  const overallPct = allTasks.length > 0 ? Math.round((doneTasks.length / allTasks.length) * 100) : 0;

  // Initialize and update graph data structure whenever `boards` change
  useEffect(() => {
    const existingNodeMap = new Map();
    nodesRef.current.forEach(n => {
      existingNodeMap.set(n.id, { x: n.x, y: n.y, vx: n.vx || 0, vy: n.vy || 0 });
    });

    const newNodes = [];
    const newEdges = [];

    // 1. Central Root Node: "Otak Proyek / Brain Core"
    const rootExisting = existingNodeMap.get('root-core');
    const rootNode = {
      id: 'root-core',
      type: 'root',
      name: 'Otak Proyek',
      subtitle: `${allProjects.length} Proyek • ${overallPct}% Selesai`,
      radius: 36,
      color: '#3b82f6',
      glowColor: '#60a5fa',
      x: rootExisting ? rootExisting.x : 0,
      y: rootExisting ? rootExisting.y : 0,
      vx: rootExisting ? rootExisting.vx : 0,
      vy: rootExisting ? rootExisting.vy : 0,
      mass: 5
    };
    newNodes.push(rootNode);

    // 2. Project Nodes (Neurons)
    const projectAngleStep = (Math.PI * 2) / Math.max(allProjects.length, 1);

    allProjects.forEach((board, bIdx) => {
      const bTasks = (board.columns || []).flatMap(c => c.tasks || []);
      const bDone = (board.columns || [])
        .filter(c => (c.name || '').toLowerCase().includes('selesai') || (c.name || '').toLowerCase().includes('done'))
        .flatMap(c => c.tasks || []);
      const bProgressPct = bTasks.length > 0 ? Math.round((bDone.length / bTasks.length) * 100) : 0;

      // Color code based on progress
      let pColor = '#818cf8'; // Violet/indigo default
      let pGlow = 'rgba(129, 140, 248, 0.4)';
      if (bProgressPct === 100) {
        pColor = '#10b981'; // Emerald
        pGlow = 'rgba(16, 185, 129, 0.5)';
      } else if (bProgressPct > 0) {
        pColor = '#06b6d4'; // Cyan/electric blue
        pGlow = 'rgba(6, 182, 212, 0.5)';
      } else if (bTasks.length === 0) {
        pColor = '#64748b'; // Slate
        pGlow = 'rgba(100, 116, 139, 0.3)';
      }

      // Radius scales with task count (Obsidian visual mass)
      const projectRadius = Math.min(38, Math.max(22, 20 + bTasks.length * 2.5));

      const existing = existingNodeMap.get(`project-${board.id}`);
      const angle = bIdx * projectAngleStep;
      const initialDist = 180 + (bIdx % 2) * 50;

      const projectNode = {
        id: `project-${board.id}`,
        type: 'project',
        data: board,
        name: board.name || 'Proyek Tanpa Nama',
        taskCount: bTasks.length,
        doneCount: bDone.length,
        progressPct: bProgressPct,
        radius: projectRadius,
        color: pColor,
        glowColor: pGlow,
        x: existing ? existing.x : Math.cos(angle) * initialDist,
        y: existing ? existing.y : Math.sin(angle) * initialDist,
        vx: existing ? existing.vx : 0,
        vy: existing ? existing.vy : 0,
        mass: 2 + bTasks.length * 0.3
      };
      newNodes.push(projectNode);

      // Edge from root to project
      newEdges.push({
        source: rootNode.id,
        target: projectNode.id,
        length: 190,
        strength: 0.05,
        color: pColor,
        pulseOffset: Math.random() * 100
      });

      // 3. Task Nodes (Synapses branching from each project)
      const taskAngleStep = (Math.PI * 2) / Math.max(bTasks.length, 1);
      bTasks.forEach((task, tIdx) => {
        const isDone = (board.columns || []).some(
          c => ((c.name || '').toLowerCase().includes('selesai') || (c.name || '').toLowerCase().includes('done')) &&
               (c.tasks || []).some(t => t.id === task.id)
        );
        const isInProgress = (board.columns || []).some(
          c => ((c.name || '').toLowerCase().includes('masih') || (c.name || '').toLowerCase().includes('progress')) &&
               (c.tasks || []).some(t => t.id === task.id)
        );

        let tColor = '#94a3b8'; // Belum (slate/amber)
        if (isDone) tColor = '#10b981'; // Selesai (emerald)
        else if (isInProgress) tColor = '#38bdf8'; // In progress (sky blue)

        const tRadius = task.priority === 'high' ? 10 : 8;
        const taskExisting = existingNodeMap.get(`task-${task.id}`);
        const tAngle = angle + (tIdx - bTasks.length / 2) * (taskAngleStep * 0.7);
        const taskDist = projectRadius + 50 + (tIdx % 3) * 20;

        const taskNode = {
          id: `task-${task.id}`,
          type: 'task',
          data: task,
          projectData: board,
          name: task.title || 'Tugas Baru',
          priority: task.priority || 'medium',
          isDone,
          isInProgress,
          radius: tRadius,
          color: tColor,
          glowColor: tColor,
          x: taskExisting ? taskExisting.x : projectNode.x + Math.cos(tAngle) * taskDist,
          y: taskExisting ? taskExisting.y : projectNode.y + Math.sin(tAngle) * taskDist,
          vx: taskExisting ? taskExisting.vx : 0,
          vy: taskExisting ? taskExisting.vy : 0,
          mass: 0.8
        };
        newNodes.push(taskNode);

        // Edge from project to task
        newEdges.push({
          source: projectNode.id,
          target: taskNode.id,
          length: 60 + (tIdx % 2) * 20,
          strength: 0.1,
          color: tColor,
          pulseOffset: Math.random() * 100
        });
      });
    });

    nodesRef.current = newNodes;
    edgesRef.current = newEdges;

    // Cosmic background starfield particles
    if (particlesRef.current.length === 0) {
      const stars = [];
      for (let i = 0; i < 80; i++) {
        stars.push({
          x: (Math.random() - 0.5) * 2000,
          y: (Math.random() - 0.5) * 2000,
          radius: Math.random() * 1.5 + 0.5,
          alpha: Math.random() * 0.6 + 0.2,
          speed: Math.random() * 0.005 + 0.002
        });
      }
      particlesRef.current = stars;
    }
  }, [boards, overallPct]);

  const hoveredNodeRef = useRef(null);
  useEffect(() => {
    hoveredNodeRef.current = hoveredNode;
  }, [hoveredNode]);

  const handleResetView = useCallback(() => {
    const container = containerRef.current;
    const width = container?.clientWidth || window.innerWidth;
    const height = container?.clientHeight || (window.innerHeight - 120);
    cameraRef.current = {
      x: width / 2,
      y: height / 2,
      scale: width < 640 ? 0.75 : 1
    };
  }, []);

  // Center the view on initial mount and when container dimensions are measured
  useEffect(() => {
    handleResetView();
    if (!containerRef.current || typeof ResizeObserver === 'undefined') return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          if (cameraRef.current.x === 0 && cameraRef.current.y === 0) {
            cameraRef.current.x = entry.contentRect.width / 2;
            cameraRef.current.y = entry.contentRect.height / 2;
          }
        }
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [handleResetView]);

  const handleZoom = (factor) => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const cx = clientWidth / 2;
    const cy = clientHeight / 2;

    const oldScale = cameraRef.current.scale;
    const newScale = Math.max(0.3, Math.min(2.5, oldScale * factor));

    // Zoom relative to center
    cameraRef.current.x = cx - (cx - cameraRef.current.x) * (newScale / oldScale);
    cameraRef.current.y = cy - (cy - cameraRef.current.y) * (newScale / oldScale);
    cameraRef.current.scale = newScale;
  };

  // 60FPS Physics Simulation & Canvas Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let isMounted = true;
    let pulseTime = 0;

    const render = () => {
      if (!isMounted) return;
      pulseTime += 0.02;

      // Ensure canvas matches screen container dimensions and DPI
      const container = containerRef.current;
      if (container) {
        const dpr = window.devicePixelRatio || 1;
        const targetW = container.clientWidth;
        const targetH = container.clientHeight;

        if (canvas.width !== targetW * dpr || canvas.height !== targetH * dpr) {
          canvas.width = targetW * dpr;
          canvas.height = targetH * dpr;
          canvas.style.width = `${targetW}px`;
          canvas.style.height = `${targetH}px`;
        }
      }

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;

      ctx.save();
      ctx.scale(dpr, dpr);

      // Deep cosmic background
      ctx.fillStyle = '#080b14';
      ctx.fillRect(0, 0, width, height);

      // Starfield background particles
      ctx.save();
      particlesRef.current.forEach((p) => {
        const sx = p.x * cameraRef.current.scale + cameraRef.current.x;
        const sy = p.y * cameraRef.current.scale + cameraRef.current.y;
        if (sx >= 0 && sx <= width && sy >= 0 && sy <= height) {
          ctx.beginPath();
          ctx.arc(sx, sy, p.radius, 0, Math.PI * 2);
          const flicker = Math.sin(pulseTime + p.x) * 0.2;
          ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.1, p.alpha + flicker)})`;
          ctx.fill();
        }
      });
      ctx.restore();

      // Apply camera transform
      ctx.save();
      ctx.translate(cameraRef.current.x, cameraRef.current.y);
      ctx.scale(cameraRef.current.scale, cameraRef.current.scale);

      const nodes = nodesRef.current;
      const edges = edgesRef.current;
      const nodeMap = new Map(nodes.map(n => [n.id, n]));

      // 1. Physics update (Force-Directed Graph)
      if (isPhysicsRunning) {
        // A. Repulsion between all pairs of nodes
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const n1 = nodes[i];
            const n2 = nodes[j];
            const dx = n2.x - n1.x;
            const dy = n2.y - n1.y;
            const distSq = dx * dx + dy * dy || 1;
            const dist = Math.sqrt(distSq);

            // Stronger repulsion for root and projects
            const repulseK = n1.type === 'root' || n2.type === 'root' ? 12000 : 4500;
            if (dist < 350) {
              const force = repulseK / distSq;
              const fx = (dx / dist) * force;
              const fy = (dy / dist) * force;

              if (n1 !== dragRef.current.draggedNode && n1.type !== 'root') {
                n1.vx -= fx / n1.mass;
                n1.vy -= fy / n1.mass;
              }
              if (n2 !== dragRef.current.draggedNode && n2.type !== 'root') {
                n2.vx += fx / n2.mass;
                n2.vy += fy / n2.mass;
              }
            }
          }
        }

        // B. Spring attraction along edges
        edges.forEach((edge) => {
          const s = nodeMap.get(edge.source);
          const t = nodeMap.get(edge.target);
          if (!s || !t) return;

          const dx = t.x - s.x;
          const dy = t.y - s.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const delta = dist - edge.length;
          const force = delta * edge.strength;

          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          if (s !== dragRef.current.draggedNode && s.type !== 'root') {
            s.vx += fx / s.mass;
            s.vy += fy / s.mass;
          }
          if (t !== dragRef.current.draggedNode && t.type !== 'root') {
            t.vx -= fx / t.mass;
            t.vy -= fy / t.mass;
          }
        });

        // C. Center gravity pull
        nodes.forEach((n) => {
          if (n.type === 'root' || n === dragRef.current.draggedNode) return;
          const dist = Math.sqrt(n.x * n.x + n.y * n.y) || 1;
          const gravity = 0.008;
          n.vx -= (n.x / dist) * gravity * n.mass;
          n.vy -= (n.y / dist) * gravity * n.mass;

          // Damping / friction
          n.vx *= 0.86;
          n.vy *= 0.86;

          // Integrate position
          n.x += n.vx;
          n.y += n.vy;
        });
      }

      // Filter matches helper
      const isNodeMatched = (n) => {
        if (!searchQuery.trim() && priorityFilter === 'all') return true;
        if (n.type === 'root') return true;
        
        let matchSearch = true;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          matchSearch = (n.name || '').toLowerCase().includes(q);
        }

        let matchPriority = true;
        if (priorityFilter !== 'all') {
          if (n.type === 'task') {
            matchPriority = n.priority === priorityFilter;
          } else if (n.type === 'project') {
            const pTasks = (n.data?.columns || []).flatMap(c => c.tasks || []);
            matchPriority = pTasks.some(t => t.priority === priorityFilter);
          }
        }

        return matchSearch && matchPriority;
      };

      // 2. Draw Edges (Neural Synaptic Lines)
      edges.forEach((edge) => {
        const s = nodeMap.get(edge.source);
        const t = nodeMap.get(edge.target);
        if (!s || !t) return;

        const sMatched = isNodeMatched(s);
        const tMatched = isNodeMatched(t);
        const isDimmed = !sMatched && !tMatched;

        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);

        ctx.lineWidth = s.type === 'root' ? 1.8 : 1.2;
        ctx.strokeStyle = isDimmed
          ? 'rgba(255, 255, 255, 0.04)'
          : `${edge.color}44`;
        ctx.stroke();

        // Animated neural energy impulses (Obsidian glowing signal dots)
        if (!isDimmed) {
          const pulseSpeed = 0.8;
          const progress = ((pulseTime * pulseSpeed + edge.pulseOffset) % 10) / 10;
          const px = s.x + (t.x - s.x) * progress;
          const py = s.y + (t.y - s.y) * progress;

          ctx.beginPath();
          ctx.arc(px, py, 1.8, 0, Math.PI * 2);
          ctx.fillStyle = edge.color;
          ctx.shadowColor = edge.color;
          ctx.shadowBlur = 6;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      // 3. Draw Nodes
      nodes.forEach((n) => {
        const isMatched = isNodeMatched(n);
        const isHovered = hoveredNodeRef.current?.id === n.id;
        const alpha = isMatched ? 1 : 0.2;

        ctx.save();
        ctx.globalAlpha = alpha;

        // Glowing outer aura
        const glowRadius = n.radius * (isHovered ? 1.6 : 1.3);
        const grad = ctx.createRadialGradient(n.x, n.y, n.radius * 0.4, n.x, n.y, glowRadius);
        grad.addColorStop(0, n.glowColor || 'rgba(59, 130, 246, 0.5)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.beginPath();
        ctx.arc(n.x, n.y, glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Node Main Body
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = n.type === 'root' ? '#1e293b' : '#0f172a';
        ctx.fill();

        ctx.lineWidth = isHovered ? 3 : 2;
        ctx.strokeStyle = n.color;
        ctx.stroke();

        // Inner icon / progress indicator
        if (n.type === 'root') {
          // Central Core Brain Glow
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.radius * 0.5, 0, Math.PI * 2);
          ctx.fillStyle = '#3b82f6';
          ctx.fill();

          // Brain text label
          ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, sans-serif';
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🧠 Otak', n.x, n.y - 4);

          ctx.font = '9px -apple-system, BlinkMacSystemFont, sans-serif';
          ctx.fillStyle = '#93c5fd';
          ctx.fillText(`${allProjects.length} Proyek`, n.x, n.y + 8);
        } else if (n.type === 'project') {
          // Progress arc around project node
          if (n.taskCount > 0) {
            const startAngle = -Math.PI / 2;
            const endAngle = startAngle + (Math.PI * 2 * (n.progressPct / 100));
            ctx.beginPath();
            ctx.arc(n.x, n.y, n.radius + 3, startAngle, endAngle);
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = n.progressPct === 100 ? '#10b981' : '#38bdf8';
            ctx.stroke();
          }

          // Inner dot or initial
          ctx.font = `bold ${n.radius > 28 ? '11px' : '9px'} -apple-system, BlinkMacSystemFont, sans-serif`;
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const projName = n.name || 'PRJ';
          ctx.fillText(projName.substring(0, 3).toUpperCase(), n.x, n.y);

          // Project Title Label beneath node
          ctx.font = '600 11px -apple-system, BlinkMacSystemFont, sans-serif';
          ctx.fillStyle = isHovered ? '#ffffff' : '#cbd5e1';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText(n.name || 'Proyek', n.x, n.y + n.radius + 7);

          // Progress pill label beneath title
          ctx.font = '500 9px -apple-system, BlinkMacSystemFont, sans-serif';
          ctx.fillStyle = n.progressPct === 100 ? '#34d399' : '#94a3b8';
          ctx.fillText(`${n.doneCount}/${n.taskCount} Selesai (${n.progressPct}%)`, n.x, n.y + n.radius + 21);
        } else if (n.type === 'task') {
          // Task node
          if (n.priority === 'high') {
            // Pulsing high priority ring
            const highPulse = (Math.sin(pulseTime * 3) + 1) * 0.5;
            ctx.beginPath();
            ctx.arc(n.x, n.y, n.radius + 2 + highPulse * 2, 0, Math.PI * 2);
            ctx.lineWidth = 1;
            ctx.strokeStyle = `rgba(244, 63, 94, ${0.4 + highPulse * 0.5})`;
            ctx.stroke();
          }

          // Task label: show when hovered or zoomed in
          if (isHovered || cameraRef.current.scale >= 0.9) {
            ctx.font = '500 9px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.fillStyle = n.isDone ? '#6ee7b7' : isHovered ? '#ffffff' : '#94a3b8';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            const rawTitle = n.name || 'Tugas';
            const cleanTitle = rawTitle.length > 20 ? rawTitle.substring(0, 18) + '...' : rawTitle;
            ctx.fillText(cleanTitle, n.x, n.y + n.radius + 4);
          }
        }

        ctx.restore();
      });

      ctx.restore();
      ctx.restore();

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      isMounted = false;
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [isPhysicsRunning, searchQuery, priorityFilter, allProjects.length]);

  // Coordinate conversion helpers: screen to graph space
  const screenToGraph = useCallback((screenX, screenY) => {
    return {
      x: (screenX - cameraRef.current.x) / cameraRef.current.scale,
      y: (screenY - cameraRef.current.y) / cameraRef.current.scale
    };
  }, []);

  // Find node at screen coordinate
  const getNodeAt = useCallback((screenX, screenY) => {
    const { x, y } = screenToGraph(screenX, screenY);
    const nodes = nodesRef.current;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      const dx = n.x - x;
      const dy = n.y - y;
      // Generous hit test target for touch & mouse
      const hitRadius = Math.max(n.radius + 8, 20);
      if (dx * dx + dy * dy <= hitRadius * hitRadius) {
        return n;
      }
    }
    return null;
  }, [screenToGraph]);

  // Mouse Interaction Handlers
  const handleMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const clickedNode = getNodeAt(sx, sy);

    if (clickedNode) {
      dragRef.current.draggedNode = clickedNode;
      dragRef.current.isDraggingCanvas = false;
    } else {
      dragRef.current.isDraggingCanvas = true;
      dragRef.current.startX = e.clientX;
      dragRef.current.startY = e.clientY;
      dragRef.current.cameraStartX = cameraRef.current.x;
      dragRef.current.cameraStartY = cameraRef.current.y;
    }
  };

  const handleMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    if (dragRef.current.draggedNode) {
      const { x, y } = screenToGraph(sx, sy);
      dragRef.current.draggedNode.x = x;
      dragRef.current.draggedNode.y = y;
      dragRef.current.draggedNode.vx = 0;
      dragRef.current.draggedNode.vy = 0;
      return;
    }

    if (dragRef.current.isDraggingCanvas) {
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      cameraRef.current.x = dragRef.current.cameraStartX + dx;
      cameraRef.current.y = dragRef.current.cameraStartY + dy;
      return;
    }

    // Hover check
    const n = getNodeAt(sx, sy);
    setHoveredNode(n);
  };

  const handleMouseUp = () => {
    // Check if it was a quick click without significant drag
    if (dragRef.current.draggedNode) {
      const target = dragRef.current.draggedNode;
      dragRef.current.draggedNode = null;

      if (target.type === 'project' && onSelectProject) {
        onSelectProject(target.data);
      } else if (target.type === 'task' && onSelectTask) {
        onSelectTask(target.data, target.projectData);
      }
    }

    dragRef.current.isDraggingCanvas = false;
  };

  // Wheel Zoom centered on cursor
  const handleWheel = (e) => {
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    const oldScale = cameraRef.current.scale;
    const newScale = Math.max(0.3, Math.min(2.5, oldScale * zoomFactor));

    cameraRef.current.x = mouseX - (mouseX - cameraRef.current.x) * (newScale / oldScale);
    cameraRef.current.y = mouseY - (mouseY - cameraRef.current.y) * (newScale / oldScale);
    cameraRef.current.scale = newScale;
  };

  // Touch Support (Pinch to Zoom, Touch Drag)
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      const rect = canvasRef.current.getBoundingClientRect();
      const sx = e.touches[0].clientX - rect.left;
      const sy = e.touches[0].clientY - rect.top;
      const clicked = getNodeAt(sx, sy);

      if (clicked) {
        dragRef.current.draggedNode = clicked;
      } else {
        dragRef.current.isDraggingCanvas = true;
        dragRef.current.startX = e.touches[0].clientX;
        dragRef.current.startY = e.touches[0].clientY;
        dragRef.current.cameraStartX = cameraRef.current.x;
        dragRef.current.cameraStartY = cameraRef.current.y;
      }
    } else if (e.touches.length === 2) {
      // Pinch to zoom start
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      dragRef.current.touchDist = Math.sqrt(dx * dx + dy * dy);
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 1) {
      const rect = canvasRef.current.getBoundingClientRect();
      const sx = e.touches[0].clientX - rect.left;
      const sy = e.touches[0].clientY - rect.top;

      if (dragRef.current.draggedNode) {
        const { x, y } = screenToGraph(sx, sy);
        dragRef.current.draggedNode.x = x;
        dragRef.current.draggedNode.y = y;
      } else if (dragRef.current.isDraggingCanvas) {
        const dx = e.touches[0].clientX - dragRef.current.startX;
        const dy = e.touches[0].clientY - dragRef.current.startY;
        cameraRef.current.x = dragRef.current.cameraStartX + dx;
        cameraRef.current.y = dragRef.current.cameraStartY + dy;
      }
    } else if (e.touches.length === 2 && dragRef.current.touchDist > 0) {
      // Pinch to zoom
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDist = Math.sqrt(dx * dx + dy * dy);
      const factor = newDist / dragRef.current.touchDist;
      dragRef.current.touchDist = newDist;

      const newScale = Math.max(0.3, Math.min(2.5, cameraRef.current.scale * factor));
      cameraRef.current.scale = newScale;
    }
  };

  const handleTouchEnd = () => {
    if (dragRef.current.draggedNode) {
      const target = dragRef.current.draggedNode;
      dragRef.current.draggedNode = null;
      if (target.type === 'project' && onSelectProject) {
        onSelectProject(target.data);
      } else if (target.type === 'task' && onSelectTask) {
        onSelectTask(target.data, target.projectData);
      }
    }
    dragRef.current.isDraggingCanvas = false;
    dragRef.current.touchDist = 0;
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[calc(100vh-8.5rem)] sm:h-[calc(100vh-7.5rem)] overflow-hidden bg-slate-950 select-none cursor-grab active:cursor-grabbing"
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="block w-full h-full"
      />

      {/* Floating HUD: Growth & Productivity Overview */}
      <div className="absolute top-4 left-4 z-20 pointer-events-none">
        <div className="glass-panel p-3.5 sm:p-4 rounded-2xl shadow-2xl border border-white/10 space-y-2 pointer-events-auto max-w-[280px] sm:max-w-xs backdrop-blur-xl">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
            <h3 className="text-xs font-black tracking-wider uppercase text-white">
              Obsidian Brain Mapping
            </h3>
          </div>
          <p className="text-[11px] text-slate-400 leading-snug">
            Visualisasi pemetaan otak proyek & kemajuan tugas. Klik node lingkaran untuk membuka pengaturan.
          </p>

          <div className="pt-2 border-t border-white/10 grid grid-cols-3 gap-2 text-center text-[10px]">
            <div className="p-1.5 rounded-xl bg-white/5">
              <span className="text-slate-400 block">Proyek</span>
              <span className="text-sm font-extrabold text-blue-400">{allProjects.length}</span>
            </div>
            <div className="p-1.5 rounded-xl bg-white/5">
              <span className="text-slate-400 block">Tugas</span>
              <span className="text-sm font-extrabold text-amber-400">{allTasks.length}</span>
            </div>
            <div className="p-1.5 rounded-xl bg-white/5">
              <span className="text-slate-400 block">Selesai</span>
              <span className="text-sm font-extrabold text-emerald-400">{overallPct}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Controls: Zoom, Pan, Physics & Legend */}
      <div className="absolute bottom-4 right-4 z-20 flex flex-col items-end space-y-2">
        {/* Legend popup */}
        {showLegend && (
          <div className="glass-panel p-3.5 rounded-2xl border border-white/10 shadow-2xl text-[11px] space-y-2 mb-2 w-52 animate-pop-in backdrop-blur-xl">
            <span className="font-bold text-white block text-xs">Petunjuk Warna Node:</span>
            <div className="space-y-1.5 text-slate-300">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-emerald-400" />
                <span>100% Selesai (Hijau)</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-cyan-400" />
                <span>Sedang Berjalan (Biru)</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-indigo-400" />
                <span>Belum Berjalan (Ungu)</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full border-2 border-rose-500 bg-rose-500/20" />
                <span>Prioritas Tinggi (Merah)</span>
              </div>
            </div>
          </div>
        )}

        <div className="glass-panel p-1.5 rounded-2xl border border-white/10 shadow-2xl flex items-center space-x-1 backdrop-blur-xl">
          <button
            onClick={() => handleZoom(1.2)}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleZoom(0.83)}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetView}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            title="Reset Kamera ke Tengah"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-white/10 my-auto" />

          <button
            onClick={() => setIsPhysicsRunning(!isPhysicsRunning)}
            className={`p-2 rounded-xl transition-colors ${
              isPhysicsRunning
                ? 'text-blue-400 bg-blue-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
            title={isPhysicsRunning ? 'Bekukan Fisika' : 'Jalankan Simulasi Fisika'}
          >
            {isPhysicsRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setShowLegend(!showLegend)}
            className={`p-2 rounded-xl transition-colors ${
              showLegend
                ? 'text-amber-400 bg-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
            title="Petunjuk Node"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Floating Empty State or Add First Project */}
      {allProjects.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="glass-panel p-8 rounded-3xl border border-white/10 shadow-2xl text-center space-y-4 max-w-sm pointer-events-auto backdrop-blur-2xl">
            <Sparkles className="w-10 h-10 text-blue-400 mx-auto animate-bounce" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Mulai Pemetaan Otak Proyek Anda</h3>
              <p className="text-xs text-slate-400">
                Belum ada proyek yang dibuat. Buat proyek pertama Anda untuk mulai menumbuhkan jaringan neuron pemikiran di sini.
              </p>
            </div>
            <button
              onClick={onCreateProject}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all active:scale-95"
            >
              + Buat Proyek Pertama
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
