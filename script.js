document.addEventListener('DOMContentLoaded', () => {
    // Matter.js module aliases
    const Engine = Matter.Engine,
          Render = Matter.Render,
          Runner = Matter.Runner,
          Bodies = Matter.Bodies,
          Body = Matter.Body,
          Composite = Matter.Composite,
          Events = Matter.Events,
          Vector = Matter.Vector;
    
    // Get DOM elements
    const gameBox = document.getElementById('game-box');
    const levelComplete = document.getElementById('level-complete');
    const levelSelection = document.getElementById('level-selection');
    const gameScreen = document.getElementById('game-screen');
    const levelButtons = document.querySelectorAll('.level-btn');
    const restartBtn = document.getElementById('restart-btn');
    const backToLevelsBtn = document.getElementById('back-to-levels-btn');
    const obstaclesContainer = document.getElementById('obstacles');
    
    // Audio setup
    let backgroundMusic = new Audio('oui.mp3');
    backgroundMusic.loop = true;
    let explosionSound = new Audio('boom.mp3'); // Add explosion sound
    let isMuted = false;
    let isSfxMuted = false; // Add SFX mute state
    
    // Create mute toggle switch
    createMuteToggle();
    createSfxToggle(); // Add SFX toggle
    
    // Set the background color of the webpage
    document.body.style.backgroundColor = '#F6DFF8';
    
    // Ensure game box has the specified background color
    gameBox.style.backgroundColor = '#FFF0F8';
    
    // Replace the title with the Pookie Bot logo
    replaceTitleWithLogo();
    
    // Start playing background music
    playBackgroundMusic();
    
    // Game box dimensions
    const boxWidth = 600; // Reverted back from 800
    const boxHeight = 400; // Reverted back from 600
    
    // Ball properties
    const ballRadius = 25;
    
    // Target properties
    const targetRadius = 25;
    
    // Physics properties
    const baseExplosionRadius = 50;
    const maxExplosionRadius = 150;
    const baseExplosionForce = 0.03;
    const maxExplosionForce = 0.10;
    const proximityMultiplier = 2.0;
    const maxHoldTime = 2000; // 2 seconds in milliseconds
    const maxExplosions = 10; // Maximum number of explosions per level
    
    // Game state
    let isLevelComplete = false;
    let isLevelFailed = false;
    let currentLevel = 1;
    let explosionsRemaining = maxExplosions; // Track remaining explosions
    let engine = null;
    let render = null;
    let runner = null;
    let ball = null;
    let target = null;
    let boundaries = [];
    let obstacles = [];
    let woodenBoxes = [];
    let isGoldCircleCollected = false; // Track if the gold circle has been collected
    
    // Hold-and-release variables
    let isHolding = false;
    let holdStartTime = 0;
    let holdPosition = { x: 0, y: 0 };
    let chargeIndicator = null;
    let holdTimer = null;
    let explosionCounter = null; // DOM element for explosion counter
    
    // Level configurations - target positions for each level
    const levelConfigs = {
        1: { 
            x: 480, // Target position inside the "3" (flipped E) - moved more to the right
            y: 270, // Target position above the middle line of the "3" - adjusted for new position
            ballStart: { x: 100, y: 100 }, // Ball starts inside the C (adjusted for new C position)
            maxExplosions: 10, // Default number of explosions
            obstacles: [
                // Letter C at top left (moved higher)
                { x: 50, y: 40, width: 30, height: 180, type: 'letter' },  // Vertical line
                { x: 80, y: 40, width: 70, height: 30, type: 'letter' },   // Top horizontal
                { x: 80, y: 190, width: 70, height: 30, type: 'letter' },   // Bottom horizontal
                
                // Letter O at top right with heart inside (moved up to match C)
                { x: 350, y: 40, width: 30, height: 150, type: 'letter' },  // Left vertical
                { x: 380, y: 40, width: 70, height: 30, type: 'letter' },   // Top horizontal
                { x: 380, y: 160, width: 70, height: 30, type: 'letter' },   // Bottom horizontal
                { x: 450, y: 40, width: 30, height: 150, type: 'letter' },  // Right vertical
                
                // Letter H at bottom left (moved more to the right)
                { x: 150, y: 250, width: 30, height: 150, type: 'letter' },  // Left vertical
                { x: 180, y: 310, width: 60, height: 30, type: 'letter' },   // Middle horizontal
                { x: 240, y: 250, width: 30, height: 150, type: 'letter' },  // Right vertical
                
                // Letter L at bottom left (moved more to the right, next to H)
                { x: 290, y: 250, width: 30, height: 150, type: 'letter' },  // Vertical
                { x: 320, y: 370, width: 100, height: 30, type: 'letter' },   // Bottom horizontal
                
                // Letter E flipped like "3" at bottom right (moved up and with more space between lines)
                { x: 550, y: 200, width: 30, height: 200, type: 'letter' },  // Right vertical (flipped and taller)
                { x: 450, y: 200, width: 100, height: 30, type: 'letter' },   // Top horizontal
                { x: 450, y: 300, width: 100, height: 30, type: 'letter' },   // Middle horizontal (more space)
                { x: 450, y: 370, width: 100, height: 30, type: 'letter' },    // Bottom horizontal (more space)

                { x: 30, y: 270, width: 90, height: 30, type: 'letter' }, // Other obstacles
                { x: 30, y: 330, width: 90, height: 30, type: 'letter' }, // Other obstacles
                { x: 240, y: 140, width: 30, height: 30, type: 'letter' },
                { x: 210, y: 110, width: 30, height: 30, type: 'letter' },
                { x: 210, y: 50, width: 30, height: 30, type: 'letter' },
                { x: 240, y: 70, width: 30, height: 30, type: 'letter' },
                { x: 180, y: 80, width: 30, height: 30, type: 'letter' },
                { x: 270, y: 110, width: 30, height: 30, type: 'letter' },
                { x: 300, y: 80, width: 30, height: 30, type: 'letter' },
                { x: 270, y: 50, width: 30, height: 30, type: 'letter' },

            ]
        },
        2: { 
            x: 100, // Position of checkpoint
            y: 100, // Moved checkpoint higher (from 200 to 100)
            ballStart: { x: 500, y: 50 }, // Ball starts high up on the right side (changed from x: 300, y: 350)
            goldCircle: { x: 100, y: 300 }, // Position of the gold circle (aligned with checkpoint x and placed lower)
            maxExplosions: 20, // Increased number of explosions for level 2
            obstacles: [
                // Prison-like border around the checkpoint
                { x: 60, y: 60, width: 15, height: 80, type: 'letter' },  // Left vertical bar
                { x: 125, y: 60, width: 15, height: 80, type: 'letter' },  // Right vertical bar
                { x: 75, y: 45, width: 50, height: 15, type: 'letter' },  // Top horizontal bar
                { x: 75, y: 140, width: 50, height: 15, type: 'letter' }  // Bottom horizontal bar
            ],
            woodenBoxes: [
                // Original stack
                { x: 200, y: 300, width: 50, height: 50 },  // Bottom box
                { x: 200, y: 250, width: 50, height: 50 },  // Middle box
                { x: 200, y: 200, width: 50, height: 50 },  // Top box
                
                // Tall stack directly above the ball
                { x: 300, y: 300, width: 50, height: 50 },  // Bottom box (above ball)
                { x: 300, y: 250, width: 50, height: 50 },  // Second box
                { x: 300, y: 200, width: 50, height: 50 },  // Third box
                { x: 300, y: 150, width: 50, height: 50 },  // Fourth box
                { x: 300, y: 100, width: 50, height: 50 },  // Fifth box
                { x: 300, y: 50, width: 50, height: 50 },   // Sixth box
                
                // Stack to the right
                { x: 350, y: 300, width: 50, height: 50 },  // Bottom box
                { x: 350, y: 250, width: 50, height: 50 },  // Second box
                { x: 350, y: 200, width: 50, height: 50 },  // Third box
                { x: 350, y: 150, width: 50, height: 50 },  // Fourth box
                
                // Stack to the left
                { x: 250, y: 300, width: 50, height: 50 },  // Bottom box
                { x: 250, y: 250, width: 50, height: 50 },  // Second box
                { x: 250, y: 200, width: 50, height: 50 },  // Third box
                { x: 250, y: 150, width: 50, height: 50 },  // Fourth box
                { x: 250, y: 100, width: 50, height: 50 },  // Fifth box
                
                // Additional stack on the right
                { x: 400, y: 300, width: 50, height: 50 },  // Bottom box
                { x: 400, y: 250, width: 50, height: 50 },  // Second box
                { x: 400, y: 200, width: 50, height: 50 }   // Third box
            ]
        },
        3: { 
            x: 350, y: 150, // Moved checkpoint up and to the right (from 300,200)
            ballStart: { x: 100, y: 50 }, // Ball starts on the left side
            obstacles: [], // Removed the SVG obstacle, leaving only the ball and checkpoint
            darkMode: true // Flag to indicate this level uses dark mode
        },
        4: { 
            x: 100, y: 100,  // top left (reverted)
            ballStart: { x: 500, y: 350 }, // Ball starts on the bottom right
            maxExplosions: 15, // Increased number of explosions for level 4
            obstacles: [
                { x: 100, y: 0, width: 400, height: 400, type: 'pizza' }, // Moved up from y: 20 to y: 0
                { x: -35, y: 115, width: 200, height: 80, type: 'carrot' } // Half size and repositioned
            ]
        },
        5: { 
            x: 400, y: 80,   // Moved checkpoint up and to the left (from 450, 100)
            ballStart: { x: 100, y: 200 }, // Ball starts even higher (from y: 300 to y: 200)
            backgroundColor: '#9393fa', // Custom background color for level 5 (light blue/purple)
            woodenBoxes: [
                // Stack of 5 boxes under the checkpoint (shifted further left)
                { x: 200, y: 350, width: 50, height: 50 },  // Bottom box (moved from 250 to 200)
                { x: 200, y: 300, width: 50, height: 50 },  // Second box
                { x: 200, y: 250, width: 50, height: 50 },  // Third box
                { x: 200, y: 200, width: 50, height: 50 },  // Fourth box
                { x: 200, y: 150, width: 50, height: 50 },  // Fifth box (just below checkpoint)
                
                // Staircase to the left (4 boxes) - shifted further left
                { x: 150, y: 350, width: 50, height: 50 },  // Moved from 200 to 150
                { x: 150, y: 300, width: 50, height: 50 },
                { x: 150, y: 250, width: 50, height: 50 },
                { x: 150, y: 200, width: 50, height: 50 },
                
                // Staircase to the left (3 boxes) - shifted further left
                { x: 100, y: 350, width: 50, height: 50 },  // Moved from 150 to 100
                { x: 100, y: 300, width: 50, height: 50 },
                { x: 100, y: 250, width: 50, height: 50 },
                
                // Staircase to the left (2 boxes) - shifted further left
                { x: 50, y: 350, width: 50, height: 50 },  // Moved from 100 to 50
                { x: 50, y: 300, width: 50, height: 50 },
                
                // Staircase to the left (1 box) - shifted further left
                { x: 0, y: 350, width: 50, height: 50 },  // Moved from 50 to 0 (flush with left edge)
                
                // Column on right side - 5 boxes high
                { x: 250, y: 350, width: 50, height: 50 },
                { x: 250, y: 300, width: 50, height: 50 },
                { x: 250, y: 250, width: 50, height: 50 },
                { x: 250, y: 200, width: 50, height: 50 },
                { x: 250, y: 150, width: 50, height: 50 },
                
                // New column of 3 boxes to the left of the rightmost column
                { x: 500, y: 350, width: 50, height: 50 },  // Bottom box
                { x: 500, y: 300, width: 50, height: 50 },  // Middle box
                { x: 500, y: 250, width: 50, height: 50 },  // Top box
                
                // Stack of 3 boxes in bottom right corner (moved to touch right edge)
                { x: 550, y: 350, width: 50, height: 50 },  // Bottom box (moved from 500 to 550)
                { x: 550, y: 300, width: 50, height: 50 },  // Middle box (removed dark grey)
                { x: 550, y: 250, width: 50, height: 50 }   // Top box
            ]
        }
    };
    
    // Function to create mute toggle switch
    function createMuteToggle() {
        // Create container for the toggle
        const toggleContainer = document.createElement('div');
        toggleContainer.id = 'mute-toggle-container';
        toggleContainer.style.position = 'fixed';
        toggleContainer.style.top = '20px';
        toggleContainer.style.right = '20px';
        toggleContainer.style.zIndex = '1000';
        toggleContainer.style.display = 'flex';
        toggleContainer.style.alignItems = 'center';
        toggleContainer.style.gap = '8px';
        
        // Create label
        const label = document.createElement('label');
        label.textContent = 'Music:';
        label.style.color = '#333';
        label.style.fontFamily = 'Arial, sans-serif';
        label.style.fontSize = '14px';
        
        // Create toggle switch container
        const switchContainer = document.createElement('div');
        switchContainer.style.position = 'relative';
        switchContainer.style.display = 'inline-block';
        switchContainer.style.width = '50px';
        switchContainer.style.height = '24px';
        
        // Create checkbox input
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = 'mute-toggle';
        checkbox.checked = true; // Start with music on
        checkbox.style.opacity = '0';
        checkbox.style.width = '0';
        checkbox.style.height = '0';
        
        // Create slider
        const slider = document.createElement('span');
        slider.style.position = 'absolute';
        slider.style.cursor = 'pointer';
        slider.style.top = '0';
        slider.style.left = '0';
        slider.style.right = '0';
        slider.style.bottom = '0';
        slider.style.backgroundColor = '#FC148F'; // Start with pink (music on)
        slider.style.transition = 'all 0.4s ease'; // Smooth transition for all properties
        slider.style.borderRadius = '34px';
        slider.style.boxShadow = '0 0 5px rgba(252, 20, 143, 0.5)'; // Initial glow effect
        
        // Create slider knob
        const knob = document.createElement('span');
        knob.style.position = 'absolute';
        knob.style.content = '""';
        knob.style.height = '16px';
        knob.style.width = '16px';
        knob.style.left = '4px';
        knob.style.bottom = '4px';
        knob.style.backgroundColor = 'white';
        knob.style.transition = 'all 0.4s ease'; // Smooth transition for all properties
        knob.style.borderRadius = '50%';
        knob.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.3)';
        knob.style.transform = 'translateX(26px)'; // Start in "on" position
        
        // Make the slider clickable to toggle the checkbox
        slider.addEventListener('click', function() {
            checkbox.checked = !checkbox.checked;
            // Manually trigger the change event
            checkbox.dispatchEvent(new Event('change'));
        });
        
        // Add event listener to checkbox
        checkbox.addEventListener('change', function() {
            if (this.checked) {
                // Animate to ON state
                slider.style.backgroundColor = '#FC148F';
                knob.style.transform = 'translateX(26px)';
                slider.style.boxShadow = '0 0 5px rgba(252, 20, 143, 0.5)'; // Glow effect when on
                
                // Update music state
                isMuted = false;
                if (gameScreen.style.display === 'none') {
                    playBackgroundMusic();
                }
            } else {
                // Animate to OFF state
                slider.style.backgroundColor = '#ccc';
                knob.style.transform = 'translateX(0)';
                slider.style.boxShadow = '0 0 2px rgba(0, 0, 0, 0.3)'; // Remove glow when off
                
                // Update music state
                isMuted = true;
                pauseBackgroundMusic();
            }
        });
        
        // Set initial state (music on)
        isMuted = false; // Ensure music starts unmuted
        
        // Assemble the toggle switch
        slider.appendChild(knob);
        switchContainer.appendChild(checkbox);
        switchContainer.appendChild(slider);
        
        // Add elements to container
        toggleContainer.appendChild(label);
        toggleContainer.appendChild(switchContainer);
        
        // Add to document
        document.body.appendChild(toggleContainer);
        
        // Debug: Log to console when toggle is clicked
        console.log('Mute toggle created and initialized with music ' + (isMuted ? 'off' : 'on'));
    }
    
    // Function to create SFX toggle switch
    function createSfxToggle() {
        // Create container for the toggle
        const toggleContainer = document.createElement('div');
        toggleContainer.id = 'sfx-toggle-container';
        toggleContainer.style.position = 'fixed';
        toggleContainer.style.top = '50px'; // Position below music toggle
        toggleContainer.style.right = '20px';
        toggleContainer.style.zIndex = '1000';
        toggleContainer.style.display = 'flex';
        toggleContainer.style.alignItems = 'center';
        toggleContainer.style.gap = '8px';
        
        // Create label
        const label = document.createElement('label');
        label.textContent = 'SFX:';
        label.style.color = '#333';
        label.style.fontFamily = 'Arial, sans-serif';
        label.style.fontSize = '14px';
        
        // Create toggle switch container
        const switchContainer = document.createElement('div');
        switchContainer.style.position = 'relative';
        switchContainer.style.display = 'inline-block';
        switchContainer.style.width = '50px';
        switchContainer.style.height = '24px';
        
        // Create checkbox input
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = 'sfx-toggle';
        checkbox.checked = true; // Start with SFX on
        checkbox.style.opacity = '0';
        checkbox.style.width = '0';
        checkbox.style.height = '0';
        
        // Create slider
        const slider = document.createElement('span');
        slider.style.position = 'absolute';
        slider.style.cursor = 'pointer';
        slider.style.top = '0';
        slider.style.left = '0';
        slider.style.right = '0';
        slider.style.bottom = '0';
        slider.style.backgroundColor = '#FC148F'; // Start with pink (SFX on)
        slider.style.transition = 'all 0.4s ease'; // Smooth transition for all properties
        slider.style.borderRadius = '34px';
        slider.style.boxShadow = '0 0 5px rgba(252, 20, 143, 0.5)'; // Initial glow effect
        
        // Create slider knob
        const knob = document.createElement('span');
        knob.style.position = 'absolute';
        knob.style.content = '""';
        knob.style.height = '16px';
        knob.style.width = '16px';
        knob.style.left = '4px';
        knob.style.bottom = '4px';
        knob.style.backgroundColor = 'white';
        knob.style.transition = 'all 0.4s ease'; // Smooth transition for all properties
        knob.style.borderRadius = '50%';
        knob.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.3)';
        knob.style.transform = 'translateX(26px)'; // Start in "on" position
        
        // Make the slider clickable to toggle the checkbox
        slider.addEventListener('click', function() {
            checkbox.checked = !checkbox.checked;
            // Manually trigger the change event
            checkbox.dispatchEvent(new Event('change'));
        });
        
        // Add event listener to checkbox
        checkbox.addEventListener('change', function() {
            if (this.checked) {
                // Animate to ON state
                slider.style.backgroundColor = '#FC148F';
                knob.style.transform = 'translateX(26px)';
                slider.style.boxShadow = '0 0 5px rgba(252, 20, 143, 0.5)'; // Glow effect when on
                
                // Update SFX state
                isSfxMuted = false;
            } else {
                // Animate to OFF state
                slider.style.backgroundColor = '#ccc';
                knob.style.transform = 'translateX(0)';
                slider.style.boxShadow = '0 0 2px rgba(0, 0, 0, 0.3)'; // Remove glow when off
                
                // Update SFX state
                isSfxMuted = true;
            }
        });
        
        // Set initial state (SFX on)
        isSfxMuted = false; // Ensure SFX starts unmuted
        
        // Assemble the toggle switch
        slider.appendChild(knob);
        switchContainer.appendChild(checkbox);
        switchContainer.appendChild(slider);
        
        // Add elements to container
        toggleContainer.appendChild(label);
        toggleContainer.appendChild(switchContainer);
        
        // Add to document
        document.body.appendChild(toggleContainer);
        
        // Debug: Log to console when toggle is clicked
        console.log('SFX toggle created and initialized with SFX ' + (isSfxMuted ? 'off' : 'on'));
    }
    
    // Function to play background music
    function playBackgroundMusic() {
        if (!isMuted) {
            backgroundMusic.currentTime = 0; // Start from beginning
            backgroundMusic.play().catch(error => {
                console.log('Audio playback failed:', error);
                // If autoplay is blocked, update the UI to reflect actual state
                const checkbox = document.getElementById('mute-toggle');
                if (checkbox) {
                    checkbox.checked = false;
                    // Trigger the change event to update the toggle appearance
                    checkbox.dispatchEvent(new Event('change'));
                }
            });
        }
    }
    
    // Function to pause background music
    function pauseBackgroundMusic() {
        backgroundMusic.pause();
    }
    
    // Initialize the game
    function init() {
        // Pause background music when entering a level
        pauseBackgroundMusic();
        
        // Reset level state
        isLevelComplete = false;
        isLevelFailed = false;
        
        // Set explosions based on level configuration or use default
        explosionsRemaining = levelConfigs[currentLevel].maxExplosions || maxExplosions;
        
        isGoldCircleCollected = false; // Reset gold circle collection state
        
        // Remove any existing gold circle
        const existingGoldCircle = document.getElementById('gold-circle');
        if (existingGoldCircle) {
            existingGoldCircle.remove();
        }
        
        // Clear any existing game elements
        if (runner) {
            Runner.stop(runner);
        }
        
        if (render) {
            Render.stop(render);
            render.canvas.remove();
        }
        
        // Clear obstacles container
        obstaclesContainer.innerHTML = '';
        
        // Always reset dark mode first to clean up any lingering elements
        resetDarkMode();
        
        // Remove any cloud backgrounds
        removeCloudBackground();
        
        // Debug: Check if SVG file exists
        if (currentLevel === 3) {
            checkSvgFile();
        }
        
        // Create a new engine
        engine = Engine.create({
            gravity: {
                x: 0,
                y: 0.6 // Reverted back from 0.8
            }
        });
        
        // Create a hidden renderer (we'll use our own rendering)
        render = Render.create({
            element: gameBox,
            engine: engine,
            options: {
                width: boxWidth,
                height: boxHeight,
                wireframes: false,
                background: 'transparent',
                showSleeping: false,
                showDebug: false,
                showBroadphase: false,
                showBounds: false,
                showVelocity: false,
                showCollisions: false,
                showSeparations: false,
                showAxes: false,
                showPositions: false,
                showAngleIndicator: false,
                showIds: false,
                showShadows: false,
                showVertexNumbers: false,
                showConvexHulls: false,
                showInternalEdges: false,
                showMousePosition: false
            }
        });
        
        // Hide the canvas - we'll use our own DOM elements for rendering
        render.canvas.style.display = 'none';
        
        // Check if current level is dark mode
        if (currentLevel === 3 && levelConfigs[currentLevel].darkMode) {
            setupDarkMode();
        } else {
            // Reset to normal mode if coming from dark mode
            resetDarkMode();
        }
        
        // Set custom background color for level 5
        if (currentLevel === 5 && levelConfigs[currentLevel].backgroundColor) {
            gameBox.style.backgroundColor = levelConfigs[currentLevel].backgroundColor;
            // Add cloud background for level 5
            addCloudBackground();
        } else {
            // Reset to default background color for other levels
            gameBox.style.backgroundColor = '#FFF0F8';
        }
        
        // Create boundaries (walls)
        boundaries = [
            // Bottom wall
            Bodies.rectangle(boxWidth / 2, boxHeight + 25, boxWidth, 50, { isStatic: true }),
            // Left wall
            Bodies.rectangle(-25, boxHeight / 2, 50, boxHeight, { isStatic: true }),
            // Right wall
            Bodies.rectangle(boxWidth + 25, boxHeight / 2, 50, boxHeight, { isStatic: true }),
            // Top wall
            Bodies.rectangle(boxWidth / 2, -25, boxWidth, 50, { isStatic: true })
        ];
        
        // Add boundaries to the world
        Composite.add(engine.world, boundaries);
        
        // Set ball starting position based on level
        let ballStartX = 275;
        let ballStartY = 50;
        
        // Check if level has custom ball starting position
        if (levelConfigs[currentLevel].ballStart) {
            ballStartX = levelConfigs[currentLevel].ballStart.x;
            ballStartY = levelConfigs[currentLevel].ballStart.y;
        }
        
        // Create ball
        ball = Bodies.circle(ballStartX, ballStartY, ballRadius, {
            restitution: 0.4,
            friction: 0.01,
            frictionAir: 0.001,
            frictionStatic: 0.5,
            render: {
                fillStyle: 'transparent',
                strokeStyle: '#3367d6',
                lineWidth: 1
            }
        });
        
        // Add ball to the world
        Composite.add(engine.world, ball);
        
        // Create DOM element for the ball
        createBallElement();
        
        // Position target based on current level
        const targetPos = levelConfigs[currentLevel];
        
        // Create target (static circle) - now completely non-interactive with physics
        target = Bodies.circle(targetPos.x, targetPos.y, targetRadius, {
            isStatic: true,
            isSensor: true, // Makes it non-solid
            render: {
                fillStyle: 'transparent',
                strokeStyle: 'transparent',
                lineWidth: 0
            },
            collisionFilter: {
                group: -1, // Doesn't collide with anything
                category: 0x0002,
                mask: 0x0000 // Mask of 0 means it won't collide with anything
            }
        });
        
        // Add target to the world
        Composite.add(engine.world, target);
        
        // Create DOM element for the target
        createTargetElement(targetPos.x, targetPos.y);
        
        // Add obstacles for Level 1
        if (currentLevel === 1 && levelConfigs[currentLevel].obstacles) {
            createObstacles(levelConfigs[currentLevel].obstacles);
        }
        
        // Add wooden boxes for Level 2
        if (currentLevel === 2 && levelConfigs[currentLevel].woodenBoxes) {
            createWoodenBoxes(levelConfigs[currentLevel].woodenBoxes);
        }
        
        // Add obstacles for Level 2
        if (currentLevel === 2 && levelConfigs[currentLevel].obstacles) {
            createObstacles(levelConfigs[currentLevel].obstacles);
        }
        
        // Add gold circle for Level 2
        if (currentLevel === 2 && levelConfigs[currentLevel].goldCircle) {
            createGoldCircle(levelConfigs[currentLevel].goldCircle.x, levelConfigs[currentLevel].goldCircle.y);
        }
        
        // Add obstacles for Level 3
        if (currentLevel === 3 && levelConfigs[currentLevel].obstacles) {
            createObstacles(levelConfigs[currentLevel].obstacles);
        }
        
        // Add obstacles for Level 4
        if (currentLevel === 4 && levelConfigs[currentLevel].obstacles) {
            createObstacles(levelConfigs[currentLevel].obstacles);
        }
        
        // Add wooden boxes for Level 5
        if (currentLevel === 5 && levelConfigs[currentLevel].woodenBoxes) {
            createWoodenBoxes(levelConfigs[currentLevel].woodenBoxes);
        }
        
        // Hide level complete message
        levelComplete.style.display = 'none';
        
        // Create explosion counter
        createExplosionCounter();
        
        // Add event listeners for hold-and-release
        gameBox.addEventListener('mousedown', startHold);
        gameBox.addEventListener('mouseup', endHold);
        gameBox.addEventListener('mouseleave', endHold);
        
        // Start the physics engine
        runner = Runner.create();
        Runner.run(runner, engine);
        
        // Start the render loop
        requestAnimationFrame(updateRender);
    }
    
    // Create DOM element for the ball
    function createBallElement() {
        // Remove existing ball element if it exists
        const existingBall = document.getElementById('ball');
        if (existingBall) {
            existingBall.remove();
        }
        
        // Create new ball element
        const ballElement = document.createElement('div');
        ballElement.id = 'ball';
        ballElement.style.width = `${ballRadius * 2}px`;
        ballElement.style.height = `${ballRadius * 2}px`;
        ballElement.style.borderRadius = '50%';
        ballElement.style.position = 'absolute';
        
        // Set background image based on level
        ballElement.style.backgroundColor = 'transparent';
        
        if (currentLevel === 4) {
            // Use monkey.png for level 4
            ballElement.style.backgroundImage = "url('monkey.png')";
        } else {
            // Use nathan.png for all other levels
            ballElement.style.backgroundImage = "url('nathan.png')";
        }
        
        ballElement.style.backgroundSize = 'cover';
        ballElement.style.backgroundPosition = 'center';
        
        // Add special glow effect for dark mode
        if (currentLevel === 3 && levelConfigs[currentLevel].darkMode) {
            ballElement.style.boxShadow = '0 0 20px rgba(255, 255, 255, 0.8)';
            ballElement.style.zIndex = '53'; // Ensure it's above the overlay
        } else {
            ballElement.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.3)';
        }
        
        // Add to game box
        gameBox.appendChild(ballElement);
    }
    
    // Create DOM element for the target
    function createTargetElement(x, y) {
        // Remove existing target element if it exists
        const existingTarget = document.getElementById('target');
        if (existingTarget) {
            existingTarget.remove();
        }
        
        // Remove existing flagpole if it exists
        const existingFlagpole = document.getElementById('flagpole');
        if (existingFlagpole) {
            existingFlagpole.remove();
        }
        
        // Create new target element
        const targetElement = document.createElement('div');
        targetElement.id = 'target';
        targetElement.style.width = `${targetRadius * 2}px`;
        targetElement.style.height = `${targetRadius * 2}px`;
        targetElement.style.borderRadius = '50%';
        targetElement.style.position = 'absolute';
        targetElement.style.left = `${x - targetRadius}px`;
        targetElement.style.top = `${y - targetRadius}px`;
        
        // Use chloe image instead of green background
        targetElement.style.backgroundColor = 'transparent';
        targetElement.style.backgroundImage = "url('chloe.png')";
        targetElement.style.backgroundSize = 'cover';
        targetElement.style.backgroundPosition = 'center';
        
        // Special styling for level 5 - green glow
        if (currentLevel === 5) {
            // Create flagpole for level 5
            const flagpole = document.createElement('div');
            flagpole.id = 'flagpole';
            flagpole.style.position = 'absolute';
            flagpole.style.width = '6px';
            flagpole.style.backgroundColor = '#888888'; // Grey color
            flagpole.style.left = `${x - 3}px`; // Center the pole (half of width)
            flagpole.style.top = `${y + targetRadius}px`; // Start from bottom of checkpoint
            flagpole.style.height = `${boxHeight - y - targetRadius}px`; // Extend to bottom of screen
            flagpole.style.zIndex = '4'; // Behind the checkpoint but above background
            
            // Add flagpole to game box
            gameBox.appendChild(flagpole);
            
            // Green glow for level 5 checkpoint
            targetElement.style.boxShadow = '0 0 20px rgba(0, 255, 0, 0.8)';
            targetElement.style.border = '3px solid rgba(0, 255, 0, 0.7)';
            targetElement.style.zIndex = '5';
            targetElement.style.animation = 'targetPulseGreen 2s infinite ease-in-out';
            
            // Add keyframes for green pulse animation if it doesn't exist
            if (!document.getElementById('greenPulseAnimation')) {
                const styleSheet = document.createElement('style');
                styleSheet.id = 'greenPulseAnimation';
                styleSheet.textContent = `
                    @keyframes targetPulseGreen {
                        0% { box-shadow: 0 0 20px rgba(0, 255, 0, 0.8); }
                        50% { box-shadow: 0 0 30px rgba(0, 255, 0, 1); }
                        100% { box-shadow: 0 0 20px rgba(0, 255, 0, 0.8); }
                    }
                `;
                document.head.appendChild(styleSheet);
            }
        } else if (currentLevel === 3 && levelConfigs[currentLevel].darkMode) {
            // Add special glow effect for dark mode
            targetElement.style.boxShadow = '0 0 25px rgba(255, 255, 255, 0.9)';
            targetElement.style.border = '3px solid rgba(255, 255, 255, 0.9)';
            targetElement.style.zIndex = '53'; // Ensure it's above the overlay
            targetElement.style.animation = 'targetPulseDark 2s infinite ease-in-out';
            targetElement.style.opacity = '0'; // Start invisible in dark mode
            targetElement.style.transition = 'opacity 0.3s'; // Smooth transition when revealed
        } else {
            // Default styling for other levels
            targetElement.style.boxShadow = '0 0 10px rgba(255, 255, 255, 0.7)';
            targetElement.style.border = '2px solid rgba(255, 255, 255, 0.8)';
            targetElement.style.zIndex = '5';
            targetElement.style.animation = 'targetPulse 2s infinite ease-in-out';
        }
        
        // Add to game box
        gameBox.appendChild(targetElement);
        
        // Create in-game restart button
        createInGameRestartButton();
    }
    
    // Create in-game restart button
    function createInGameRestartButton() {
        // Remove existing in-game restart button if it exists
        const existingButton = document.getElementById('in-game-restart');
        if (existingButton) {
            existingButton.remove();
        }
        
        // Create button container
        const buttonContainer = document.createElement('div');
        buttonContainer.id = 'in-game-restart';
        buttonContainer.style.position = 'absolute';
        buttonContainer.style.top = '500px'; // Position below the game box
        buttonContainer.style.left = '50%'; // Center horizontally
        buttonContainer.style.transform = 'translateX(-290px)'; // Offset to the left of center
        buttonContainer.style.zIndex = '100';
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '10px';
        
        // Create restart button
        const restartButton = document.createElement('button');
        restartButton.textContent = 'Restart Level';
        restartButton.style.padding = '12px 15px';
        restartButton.style.backgroundColor = '#FC148F'; // Changed to bright pink
        restartButton.style.color = 'white';
        restartButton.style.border = 'none';
        restartButton.style.borderRadius = '5px';
        restartButton.style.cursor = 'pointer';
        restartButton.style.fontFamily = 'Arial, sans-serif';
        restartButton.style.fontSize = '14px';
        restartButton.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.2)';
        restartButton.style.transition = 'background-color 0.2s';
        
        // Add hover effect
        restartButton.onmouseover = () => {
            restartButton.style.backgroundColor = '#D1107A'; // Darker shade of pink for hover
        };
        restartButton.onmouseout = () => {
            restartButton.style.backgroundColor = '#FC148F'; // Back to original pink
        };
        
        // Add click event - special handling for level 4
        restartButton.addEventListener('click', () => {
            if (currentLevel === 4) {
                // For level 4, use the same logic as the level failed restart button
                
                // Remove any existing level failed screen
                const existingLevelFailed = document.getElementById('level-failed');
                if (existingLevelFailed) {
                    existingLevelFailed.remove();
                }
                
                // Reset game state
                isLevelComplete = false;
                isLevelFailed = false;
                explosionsRemaining = maxExplosions;
                
                // Clear previous physics engine if it exists
                if (runner) {
                    Runner.stop(runner);
                }
                
                if (render) {
                    Render.stop(render);
                    render.canvas.remove();
                }
                
                // Clear obstacles container
                obstaclesContainer.innerHTML = '';
                
                // Initialize the level again
                init();
            } else {
                // For other levels, use the normal restart logic
                init(); // Reset the current level
            }
        });
        
        // Create quit level button
        const quitButton = document.createElement('button');
        quitButton.textContent = 'Quit Level';
        quitButton.style.padding = '8px 15px';
        quitButton.style.backgroundColor = '#FC148F'; // Same bright pink
        quitButton.style.color = 'white';
        quitButton.style.border = 'none';
        quitButton.style.borderRadius = '5px';
        quitButton.style.cursor = 'pointer';
        quitButton.style.fontFamily = 'Arial, sans-serif';
        quitButton.style.fontSize = '14px';
        quitButton.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.2)';
        quitButton.style.transition = 'background-color 0.2s';
        
        // Add hover effect
        quitButton.onmouseover = () => {
            quitButton.style.backgroundColor = '#D1107A'; // Darker shade of pink for hover
        };
        quitButton.onmouseout = () => {
            quitButton.style.backgroundColor = '#FC148F'; // Back to original pink
        };
        
        // Add click event
        quitButton.addEventListener('click', () => {
            showLevelSelection(); // Go back to level selection screen
        });
        
        // Add buttons to container
        buttonContainer.appendChild(restartButton);
        buttonContainer.appendChild(quitButton);
        
        // Add container to game screen
        gameScreen.appendChild(buttonContainer);
    }
    
    // Create obstacles for the level
    function createObstacles(obstacleConfigs) {
        obstacles = [];
        
        obstacleConfigs.forEach(config => {
            if (config.type === 'svg') {
                // Create SVG obstacle
                createSvgObstacle(config.x, config.y, config.width, config.height);
            } else if (config.type === 'pizza') {
                // Create pizza obstacle
                const pizzaBody = createPizzaObstacle(config.x, config.y, config.width, config.height);
                // Pizza body is already added to obstacles array in createPizzaObstacle
            } else if (config.type === 'carrot') {
                // Create carrot obstacle
                const carrotBody = createCarrotObstacle(config.x, config.y, config.width, config.height);
                // Carrot body is already added to obstacles array in createCarrotObstacle
            } else if (config.type === 'letter') {
                // Create letter obstacle
                const letterBody = createLetterObstacle(config.x, config.y, config.width, config.height);
                // Letter body is already added to obstacles array in createLetterObstacle
            } else if (config.type === 'heart') {
                // Create heart obstacle
                const heartBody = createHeartObstacle(config.x, config.y, config.width, config.height);
                // Heart body is already added to obstacles array in createHeartObstacle
            } else {
                // Create Matter.js body for regular obstacles
                const obstacle = Bodies.rectangle(
                    config.x + config.width / 2,
                    config.y + config.height / 2,
                    config.width,
                    config.height,
                    {
                        isStatic: true,
                        render: {
                            fillStyle: config.type === 'platform' ? '#8e44ad' : '#e74c3c',
                            strokeStyle: config.type === 'platform' ? '#7d3c98' : '#c0392b',
                            lineWidth: 2
                        }
                    }
                );
                
                // Add to world
                Composite.add(engine.world, obstacle);
                obstacles.push(obstacle);
                
                // Create DOM element
                const obstacleElement = document.createElement('div');
                obstacleElement.className = config.type === 'platform' ? 'obstacle platform' : 'obstacle';
                obstacleElement.style.left = `${config.x}px`;
                obstacleElement.style.top = `${config.y}px`;
                obstacleElement.style.width = `${config.width}px`;
                obstacleElement.style.height = `${config.height}px`;
                
                // Add to obstacles container
                obstaclesContainer.appendChild(obstacleElement);
            }
        });
    }
    
    // Create SVG obstacle
    function createSvgObstacle(x, y, width, height) {
        // Create Matter.js body for SVG (using a circle for better collision)
        const svgBody = Bodies.circle(x + width/2, y + height/2, width/2, {
            isStatic: true,
            restitution: 0.6, // Make it bouncy
            friction: 0.1,
            render: {
                fillStyle: 'transparent',
                strokeStyle: 'transparent',
                lineWidth: 0
            }
        });
        
        // Add to world
        Composite.add(engine.world, svgBody);
        obstacles.push(svgBody);
        
        // Create DOM element for SVG
        const svgElement = document.createElement('div');
        svgElement.className = 'svg-obstacle';
        svgElement.style.position = 'absolute';
        svgElement.style.left = `${x}px`;
        svgElement.style.top = `${y}px`;
        svgElement.style.width = `${width}px`;
        svgElement.style.height = `${height}px`;
        svgElement.style.zIndex = '10';
        svgElement.style.backgroundColor = 'transparent'; // Make background transparent
        svgElement.style.border = 'none'; // Remove border
        
        // Use an img tag instead of trying to embed the SVG directly
        const imgElement = document.createElement('img');
        imgElement.src = 'file.svg';
        imgElement.style.width = '100%';
        imgElement.style.height = '100%';
        imgElement.style.objectFit = 'contain';
        imgElement.style.filter = 'drop-shadow(0 0 10px rgba(0,0,0,0.3))'; // Add shadow to the SVG itself
        imgElement.onerror = () => {
            console.error('Failed to load SVG image');
            svgElement.innerHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:red;">Error loading SVG</div>';
        };
        
        // Add the img to the container
        svgElement.appendChild(imgElement);
        
        // Add to obstacles container
        obstaclesContainer.appendChild(svgElement);
        
        console.log('SVG obstacle created at', x, y, 'with dimensions', width, height);
    }
    
    // Create pizza obstacle
    function createPizzaObstacle(x, y, width, height) {
        // Calculate center point
        const centerX = x + width/2;
        const centerY = y + height/2;
        
        // Define simple vertices for an arrow shape
        // These are absolute coordinates, not relative to center
        const originalVertices = [
            { x: 80, y: 90 },   // 0: Arrow tip
            { x: 120, y: 60 },  // 1: Right corner of arrow head
            { x: 250, y: 60 },  // 2: Right inner corner
            { x: 310, y: 73 },  // 3: Bottom right
            { x: 294, y: 125 },
            { x: 265, y: 190 },
            { x: 200, y: 320 }, // 5
            { x: 178, y: 320 }, // 6
            { x: 145, y: 215 },
            { x: 110, y: 160 }
        ];
        
        // Calculate the center of the vertices
        let vertexSumX = 0;
        let vertexSumY = 0;
        originalVertices.forEach(vertex => {
            vertexSumX += vertex.x;
            vertexSumY += vertex.y;
        });
        const vertexCenterX = vertexSumX / originalVertices.length;
        const vertexCenterY = vertexSumY / originalVertices.length;
        
        // Calculate the offset needed to center the vertices at the container center
        const offsetX = centerX - vertexCenterX;
        const offsetY = centerY - vertexCenterY;
        
        // Create a new set of vertices centered at the container center
        const centeredVertices = originalVertices.map(vertex => ({
            x: vertex.x + offsetX,
            y: vertex.y + offsetY
        }));
        
        // Create a custom shape using the centered vertices
        let pizzaBody = null;
        try {
            // Try creating the body with the centered vertices
            pizzaBody = Bodies.fromVertices(centerX, centerY, [centeredVertices], {
                isStatic: true,
                restitution: 0.7,
                friction: 0.1,
                render: {
                    fillStyle: 'transparent',
                    strokeStyle: 'transparent',
                    lineWidth: 0
                },
                flagInternal: true
            });
            
            // If the body doesn't have all vertices, throw an error to try the fallback
            if (pizzaBody.vertices.length < centeredVertices.length) {
                throw new Error('Not all vertices were included');
            }
        } catch (e) {
            console.log('Falling back to manual polygon creation:', e.message);
            
            // If that fails, create a simple polygon with the vertices
            pizzaBody = Bodies.polygon(centerX, centerY, centeredVertices.length, width/3, {
                isStatic: true,
                restitution: 0.7,
                friction: 0.1,
                render: {
                    fillStyle: 'transparent',
                    strokeStyle: 'transparent',
                    lineWidth: 0
                }
            });
            
            // Manually set the vertices
            Body.setVertices(pizzaBody, centeredVertices);
        }
        
        // Add to world
        Composite.add(engine.world, pizzaBody);
        obstacles.push(pizzaBody);
        
        // Create a master container for the entire pizza obstacle
        const masterContainer = document.createElement('div');
        masterContainer.className = 'pizza-master-container';
        masterContainer.style.position = 'absolute';
        masterContainer.style.width = `${width}px`;
        masterContainer.style.height = `${height}px`;
        masterContainer.style.left = `${x}px`;
        masterContainer.style.top = `${y}px`;
        masterContainer.style.transformOrigin = 'center center';
        masterContainer.style.zIndex = '10';
        
        // Create the pizza image
        const imgElement = document.createElement('img');
        imgElement.src = 'pizza-removebg-preview.png';
        imgElement.style.width = '100%';
        imgElement.style.height = '100%';
        imgElement.style.objectFit = 'contain';
        imgElement.style.filter = 'drop-shadow(0 0 15px rgba(255,100,0,0.5))';
        imgElement.style.position = 'absolute';
        imgElement.style.top = '30px'; // Move the image down by 30px
        imgElement.style.left = '0';
        
        // Ensure transparency is preserved
        imgElement.style.mixBlendMode = 'normal';
        imgElement.style.imageRendering = 'auto';
        
        imgElement.onerror = () => {
            console.error('Failed to load pizza image');
            masterContainer.innerHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:red;">Error loading pizza image</div>';
        };
        
        // Create the physics boundary visualization
        const physicsContainer = document.createElement('div');
        physicsContainer.className = 'physics-container';
        physicsContainer.style.position = 'absolute';
        physicsContainer.style.width = `${width}px`;
        physicsContainer.style.height = `${height}px`;
        physicsContainer.style.top = '0';
        physicsContainer.style.left = '0';
        physicsContainer.style.pointerEvents = 'none';
        physicsContainer.style.zIndex = '15';
        
        // Get the vertices of the physics body
        const vertices = pizzaBody.vertices;
        
        // Create SVG element to draw the polygon
        const svgElem = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svgElem.setAttribute('width', '100%');
        svgElem.setAttribute('height', '100%');
        svgElem.style.position = 'absolute';
        svgElem.style.top = '0';
        svgElem.style.left = '0';
        
        // Create polygon element for the actual physics body
        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        const points = vertices.map(v => `${v.x - x},${v.y - y}`).join(' ');
        polygon.setAttribute('points', points);
        polygon.setAttribute('fill', 'rgba(255, 0, 0, 0)'); // Changed to fully transparent
        polygon.setAttribute('stroke', 'transparent'); // Changed to transparent
        polygon.setAttribute('stroke-width', '0'); // Removed stroke width
        svgElem.appendChild(polygon);
        
        // Add SVG to physics container
        physicsContainer.appendChild(svgElem);
        
        // Add elements to the master container
        masterContainer.appendChild(imgElement);
        masterContainer.appendChild(physicsContainer);
        
        // Add master container to obstacles container
        obstaclesContainer.appendChild(masterContainer);
        
        // Log vertices to console for reference (keeping this for debugging purposes)
        console.log('Pizza obstacle vertices:', pizzaBody.vertices.map(v => ({x: Math.round(v.x), y: Math.round(v.y)})));
        console.log('Original vertices:', originalVertices);
        console.log('Centered vertices:', centeredVertices);
        console.log('Physics body position:', pizzaBody.position);
        console.log('Vertices count - Original:', originalVertices.length, 'Physics body:', pizzaBody.vertices.length);
        console.log('Original vertex center:', {x: vertexCenterX, y: vertexCenterY});
        console.log('Container center:', {x: centerX, y: centerY});
        console.log('Offset applied:', {x: offsetX, y: offsetY});
        
        // Store references for rotation
        pizzaBody.masterContainer = masterContainer;
        pizzaBody.rotationSpeed = 0.015; // Rotation speed in radians per frame (increased from 0.005)
        
        console.log('Pizza obstacle created at', x, y, 'with dimensions', width, height);
        
        return pizzaBody; // Return the body for reference in the update loop
    }
    
    // Create carrot obstacle
    function createCarrotObstacle(x, y, width, height) {
        // Calculate center point
        const centerX = x + width/2;
        const centerY = y + height/2;
        
        // Define vertices for the carrot shape - these can be customized
        // These are absolute coordinates, not relative to center
        const carrotVertices = [
            { x: 50, y: 70 },   // Top left
            { x: 70, y: 40 },  // Top right
            { x: 210, y: 50 },  // Middle right
            { x: 210, y: 70 }
        ];
        
        // Calculate the center of the vertices
        let vertexSumX = 0;
        let vertexSumY = 0;
        carrotVertices.forEach(vertex => {
            vertexSumX += vertex.x;
            vertexSumY += vertex.y;
        });
        const vertexCenterX = vertexSumX / carrotVertices.length;
        const vertexCenterY = vertexSumY / carrotVertices.length;
        
        // Calculate the offset needed to center the vertices at the container center
        const offsetX = centerX - vertexCenterX;
        const offsetY = centerY - vertexCenterY;
        
        // Create a new set of vertices centered at the container center
        const centeredVertices = carrotVertices.map(vertex => ({
            x: vertex.x + offsetX,
            y: vertex.y + offsetY
        }));
        
        // Create a custom shape using the centered vertices
        let carrotBody = null;
        try {
            // Try creating the body with the centered vertices
            carrotBody = Bodies.fromVertices(centerX, centerY, [centeredVertices], {
                isStatic: true,
                restitution: 0.7,
                friction: 0.1,
                render: {
                    fillStyle: 'transparent',
                    strokeStyle: 'transparent',
                    lineWidth: 0
                },
                flagInternal: true
            });
            
            // If the body doesn't have all vertices, throw an error to try the fallback
            if (carrotBody.vertices.length < centeredVertices.length) {
                throw new Error('Not all vertices were included');
            }
        } catch (e) {
            console.log('Falling back to manual polygon creation for carrot:', e.message);
            
            // If that fails, create a simple polygon with the vertices
            carrotBody = Bodies.polygon(centerX, centerY, centeredVertices.length, width/3, {
                isStatic: true,
                restitution: 0.7,
                friction: 0.1,
                render: {
                    fillStyle: 'transparent',
                    strokeStyle: 'transparent',
                    lineWidth: 0
                }
            });
            
            // Manually set the vertices
            Body.setVertices(carrotBody, centeredVertices);
        }
        
        // Add to world
        Composite.add(engine.world, carrotBody);
        obstacles.push(carrotBody);
        
        // Create a master container for the entire carrot obstacle
        const masterContainer = document.createElement('div');
        masterContainer.className = 'carrot-master-container';
        masterContainer.style.position = 'absolute';
        masterContainer.style.width = `${width}px`;
        masterContainer.style.height = `${height}px`;
        masterContainer.style.left = `${x}px`;
        masterContainer.style.top = `${y}px`;
        masterContainer.style.transformOrigin = 'center center';
        masterContainer.style.zIndex = '10';
        
        // Create the carrot image
        const imgElement = document.createElement('img');
        imgElement.src = 'carrot.png';
        imgElement.style.width = '100%';
        imgElement.style.height = '100%';
        imgElement.style.objectFit = 'contain';
        imgElement.style.filter = 'drop-shadow(0 0 15px rgba(255,150,0,0.5))';
        imgElement.style.position = 'absolute';
        imgElement.style.top = '0';
        imgElement.style.left = '0';
        
        // Ensure transparency is preserved
        imgElement.style.mixBlendMode = 'normal';
        imgElement.style.imageRendering = 'auto';
        
        imgElement.onerror = () => {
            console.error('Failed to load carrot image');
            masterContainer.innerHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:red;">Error loading carrot image</div>';
        };
        
        // Create the physics boundary visualization
        const physicsContainer = document.createElement('div');
        physicsContainer.className = 'physics-container';
        physicsContainer.style.position = 'absolute';
        physicsContainer.style.width = `${width}px`;
        physicsContainer.style.height = `${height}px`;
        physicsContainer.style.top = '0';
        physicsContainer.style.left = '0';
        physicsContainer.style.pointerEvents = 'none';
        physicsContainer.style.zIndex = '15';
        
        // Get the vertices of the physics body
        const vertices = carrotBody.vertices;
        
        // Create SVG element to draw the polygon
        const svgElem = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svgElem.setAttribute('width', '100%');
        svgElem.setAttribute('height', '100%');
        svgElem.style.position = 'absolute';
        svgElem.style.top = '0';
        svgElem.style.left = '0';
        
        // Create polygon element for the actual physics body
        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        const points = vertices.map(v => `${v.x - x},${v.y - y}`).join(' ');
        polygon.setAttribute('points', points);
        polygon.setAttribute('fill', 'rgba(0, 255, 0, 0)'); // Changed to fully transparent
        polygon.setAttribute('stroke', 'transparent'); // Changed to transparent
        polygon.setAttribute('stroke-width', '0'); // Removed stroke width
        svgElem.appendChild(polygon);
        
        // Add SVG to physics container
        physicsContainer.appendChild(svgElem);
        
        // Add elements to the master container
        masterContainer.appendChild(imgElement);
        masterContainer.appendChild(physicsContainer);
        
        // Add master container to obstacles container
        obstaclesContainer.appendChild(masterContainer);
        
        // Log vertices to console for reference (keeping this for debugging purposes)
        console.log('Carrot obstacle vertices:', carrotBody.vertices.map(v => ({x: Math.round(v.x), y: Math.round(v.y)})));
        console.log('Original carrot vertices:', carrotVertices);
        console.log('Centered carrot vertices:', centeredVertices);
        console.log('Carrot physics body position:', carrotBody.position);
        console.log('Carrot vertices count - Original:', carrotVertices.length, 'Physics body:', carrotBody.vertices.length);
        console.log('Carrot original vertex center:', {x: vertexCenterX, y: vertexCenterY});
        console.log('Carrot container center:', {x: centerX, y: centerY});
        console.log('Carrot offset applied:', {x: offsetX, y: offsetY});
        
        // Note: We don't add rotation for the carrot
        
        console.log('Carrot obstacle created at', x, y, 'with dimensions', width, height);
        
        return carrotBody; // Return the body for reference in the update loop
    }
    
    // Create letter obstacle
    function createLetterObstacle(x, y, width, height) {
        // Create Matter.js body for letter
        const letterBody = Bodies.rectangle(x + width/2, y + height/2, width, height, {
            isStatic: true,
            render: {
                fillStyle: '#3498db',
                strokeStyle: '#2980b9',
                lineWidth: 2
            }
        });
        
        // Add to world
        Composite.add(engine.world, letterBody);
        obstacles.push(letterBody);
        
        // Create DOM element
        const letterElement = document.createElement('div');
        
        // Add special class for level 2 prison bars
        if (currentLevel === 2) {
            letterElement.className = 'letter-obstacle prison-bar';
            letterElement.style.backgroundColor = '#777';
            letterElement.style.border = '2px solid #555';
            letterElement.style.boxShadow = '0 0 5px rgba(0, 0, 0, 0.5)';
        } else {
            letterElement.className = 'letter-obstacle';
        }
        
        letterElement.style.left = `${x}px`;
        letterElement.style.top = `${y}px`;
        letterElement.style.width = `${width}px`;
        letterElement.style.height = `${height}px`;
        
        // Add to obstacles container
        obstaclesContainer.appendChild(letterElement);
        
        return letterBody; // Return the body for reference in the update loop
    }
    
    // Create heart obstacle
    function createHeartObstacle(x, y, width, height) {
        // Create Matter.js body for heart
        const heartBody = Bodies.rectangle(x + width/2, y + height/2, width, height, {
            isStatic: true,
            render: {
                fillStyle: '#e74c3c',
                strokeStyle: '#c0392b',
                lineWidth: 2
            }
        });
        
        // Add to world
        Composite.add(engine.world, heartBody);
        obstacles.push(heartBody);
        
        // Create DOM element
        const heartElement = document.createElement('div');
        heartElement.className = 'heart-obstacle';
        heartElement.style.left = `${x}px`;
        heartElement.style.top = `${y}px`;
        heartElement.style.width = `${width}px`;
        heartElement.style.height = `${height}px`;
        
        // Add to obstacles container
        obstaclesContainer.appendChild(heartElement);
        
        return heartBody; // Return the body for reference in the update loop
    }
    
    // Create wooden boxes for the level
    function createWoodenBoxes(boxConfigs) {
        woodenBoxes = [];
        
        boxConfigs.forEach(config => {
            // Determine box color based on properties
            let fillColor = '#d35400';  // Default wooden box color
            let strokeColor = '#a04000'; // Default wooden box stroke color
            
            // Check if this box should be dark grey
            if (config.darkGrey) {
                fillColor = '#333333';  // Dark grey fill
                strokeColor = '#222222'; // Darker grey stroke
            }
            
            // Create Matter.js body
            const box = Bodies.rectangle(
                config.x + config.width / 2,
                config.y + config.height / 2,
                config.width,
                config.height,
                {
                    restitution: 0.4, // Increased from 0.3
                    friction: 0.1, // Reduced from 0.3
                    frictionAir: 0.001, // Reduced from 0.01
                    render: {
                        fillStyle: fillColor,
                        strokeStyle: strokeColor,
                        lineWidth: 2
                    }
                }
            );
            
            // Add to world
            Composite.add(engine.world, box);
            woodenBoxes.push({
                body: box,
                width: config.width,
                height: config.height,
                element: null,
                darkGrey: config.darkGrey // Store the darkGrey property
            });
            
            // Create DOM element
            const boxElement = document.createElement('div');
            boxElement.className = config.darkGrey ? 'wooden-box dark-grey' : 'wooden-box';
            boxElement.style.width = `${config.width}px`;
            boxElement.style.height = `${config.height}px`;
            
            // Apply dark grey style if needed
            if (config.darkGrey) {
                boxElement.style.backgroundColor = '#333333';
                boxElement.style.borderColor = '#222222';
            }
            
            // Add to obstacles container
            obstaclesContainer.appendChild(boxElement);
            
            // Store reference to the element
            woodenBoxes[woodenBoxes.length - 1].element = boxElement;
        });
    }
    
    // Create explosion counter
    function createExplosionCounter() {
        // Remove existing counter if it exists
        const existingCounter = document.getElementById('explosion-counter');
        if (existingCounter) {
            existingCounter.remove();
        }
        
        // Create counter container
        explosionCounter = document.createElement('div');
        explosionCounter.id = 'explosion-counter';
        explosionCounter.style.position = 'absolute';
        explosionCounter.style.top = '500px'; // Position below the game box
        explosionCounter.style.left = '50%'; // Center horizontally
        explosionCounter.style.transform = 'translateX(170px)'; // Offset to the right of center
        explosionCounter.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        explosionCounter.style.color = 'white';
        explosionCounter.style.padding = '10px';
        explosionCounter.style.borderRadius = '5px';
        explosionCounter.style.fontFamily = 'Arial, sans-serif';
        explosionCounter.style.zIndex = '100';
        explosionCounter.style.display = 'flex';
        explosionCounter.style.alignItems = 'center';
        explosionCounter.style.gap = '5px';
        
        // Create explosion icon
        const explosionIcon = document.createElement('div');
        explosionIcon.style.width = '20px';
        explosionIcon.style.height = '20px';
        explosionIcon.style.borderRadius = '50%';
        explosionIcon.style.backgroundColor = '#ff5722';
        explosionIcon.style.boxShadow = '0 0 5px #ff9800';
        
        // Create label text
        const labelText = document.createElement('span');
        labelText.textContent = 'Bombs: ';
        labelText.style.marginRight = '5px';
        
        // Create counter text with ID for easy updating
        const counterText = document.createElement('span');
        counterText.id = 'bombs-count';
        counterText.textContent = `${explosionsRemaining}`;
        
        // Add elements to counter
        explosionCounter.appendChild(labelText);
        explosionCounter.appendChild(explosionIcon);
        explosionCounter.appendChild(counterText);
        
        // Add counter to game screen
        gameScreen.appendChild(explosionCounter);
    }
    
    // Update explosion counter
    function updateExplosionCounter() {
        if (explosionCounter) {
            const counterText = document.getElementById('bombs-count');
            if (counterText) {
                counterText.textContent = `${explosionsRemaining}`;
            }
        }
    }
    
    // Show level failed message
    function showLevelFailed() {
        isLevelFailed = true;
        
        // Create level failed container
        const levelFailed = document.createElement('div');
        levelFailed.id = 'level-failed';
        levelFailed.style.position = 'absolute';
        levelFailed.style.top = '50%';
        levelFailed.style.left = '50%';
        levelFailed.style.transform = 'translate(-50%, -50%)';
        levelFailed.style.backgroundColor = 'rgba(231, 76, 60, 0.9)';
        levelFailed.style.color = 'white';
        levelFailed.style.padding = '20px';
        levelFailed.style.borderRadius = '10px';
        levelFailed.style.textAlign = 'center';
        levelFailed.style.fontFamily = 'Arial, sans-serif';
        levelFailed.style.zIndex = '200';
        levelFailed.style.minWidth = '300px';
        
        // Create heading
        const heading = document.createElement('h2');
        heading.textContent = 'Level Failed!';
        heading.style.margin = '0 0 15px 0';
        
        // Create message
        const message = document.createElement('p');
        message.textContent = 'You ran out of explosions.';
        message.style.margin = '0 0 20px 0';
        
        // Create buttons container
        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.display = 'flex';
        buttonsContainer.style.justifyContent = 'center';
        buttonsContainer.style.gap = '10px';
        
        // Create restart button
        const restartButton = document.createElement('button');
        restartButton.textContent = 'Restart Level';
        restartButton.style.padding = '8px 15px';
        restartButton.style.backgroundColor = '#3498db';
        restartButton.style.color = 'white';
        restartButton.style.border = 'none';
        restartButton.style.borderRadius = '5px';
        restartButton.style.cursor = 'pointer';
        restartButton.addEventListener('click', () => {
            levelFailed.remove();
            init();
        });
        
        // Create back to levels button
        const backButton = document.createElement('button');
        backButton.textContent = 'Back to Levels';
        backButton.style.padding = '8px 15px';
        backButton.style.backgroundColor = '#95a5a6';
        backButton.style.color = 'white';
        backButton.style.border = 'none';
        backButton.style.borderRadius = '5px';
        backButton.style.cursor = 'pointer';
        backButton.addEventListener('click', () => {
            levelFailed.remove();
            showLevelSelection();
        });
        
        // Add buttons to container
        buttonsContainer.appendChild(restartButton);
        buttonsContainer.appendChild(backButton);
        
        // Add elements to level failed container
        levelFailed.appendChild(heading);
        levelFailed.appendChild(message);
        levelFailed.appendChild(buttonsContainer);
        
        // Add level failed to game box
        gameBox.appendChild(levelFailed);
        
        // Remove event listeners
        gameBox.removeEventListener('mousedown', startHold);
        gameBox.removeEventListener('mouseup', endHold);
        gameBox.removeEventListener('mouseleave', endHold);
    }
    
    // Update render positions of DOM elements
    function updateRender() {
        if (isLevelComplete || isLevelFailed) return;
        
        // Update ball position
        const ballElement = document.getElementById('ball');
        if (ballElement && ball) {
            ballElement.style.left = `${ball.position.x - ballRadius}px`;
            ballElement.style.top = `${ball.position.y - ballRadius}px`;
            
            // Update ball light position in dark mode
            if (currentLevel === 3 && levelConfigs[currentLevel].darkMode) {
                const ballLight = document.getElementById('ball-light');
                if (ballLight) {
                    ballLight.style.left = `${ball.position.x - 75}px`; // Center the 150px light
                    ballLight.style.top = `${ball.position.y - 75}px`;
                    
                    // Check if ball light is near the checkpoint to reveal it
                    if (target) {
                        const targetElement = document.getElementById('target');
                        if (targetElement) {
                            const distance = Math.sqrt(
                                (ball.position.x - target.position.x) * (ball.position.x - target.position.x) + 
                                (ball.position.y - target.position.y) * (ball.position.y - target.position.y)
                            );
                            
                            // If ball light is close to the target, make it visible
                            if (distance < 80) { // Decreased from 100px to 80px
                                targetElement.style.opacity = '1';
                            }
                        }
                    }
                }
            }
        }
        
        // Update wooden boxes positions
        woodenBoxes.forEach(box => {
            if (box.element && box.body) {
                const angle = box.body.angle;
                box.element.style.left = `${box.body.position.x - box.width / 2}px`;
                box.element.style.top = `${box.body.position.y - box.height / 2}px`;
                box.element.style.transform = `rotate(${angle}rad)`;
            }
        });
        
        // Update pizza rotation
        obstacles.forEach(obstacle => {
            if (obstacle.masterContainer && obstacle.rotationSpeed) {
                // Rotate the physics body
                Body.rotate(obstacle, obstacle.rotationSpeed);
                
                // Update the visual elements to match the physics body rotation
                const angle = obstacle.angle;
                
                // Rotate the master container
                obstacle.masterContainer.style.transform = `rotate(${angle}rad)`;
            }
        });
        
        // Check for proximity between ball and target
        if (ball && target) {
            const dx = ball.position.x - target.position.x;
            const dy = ball.position.y - target.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // If centers are close enough, complete the level
            if (distance < ballRadius) {
                completeLevel();
            }
        }
        
        // Check for collision with gold circle in level 2
        if (currentLevel === 2 && !isGoldCircleCollected && ball && levelConfigs[currentLevel].goldCircle) {
            const goldCircleX = levelConfigs[currentLevel].goldCircle.x;
            const goldCircleY = levelConfigs[currentLevel].goldCircle.y;
            const dx = ball.position.x - goldCircleX;
            const dy = ball.position.y - goldCircleY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // If ball touches gold circle
            if (distance < ballRadius + 15) { // 15 is half the gold circle's width
                // Mark as collected
                isGoldCircleCollected = true;
                
                // Remove gold circle
                const goldCircleElement = document.getElementById('gold-circle');
                if (goldCircleElement) {
                    goldCircleElement.style.transition = 'transform 0.3s, opacity 0.3s';
                    goldCircleElement.style.transform = 'scale(1.5)';
                    goldCircleElement.style.opacity = '0';
                    
                    // Remove after animation
                    setTimeout(() => {
                        goldCircleElement.remove();
                    }, 300);
                }
                
                // Remove prison bars
                const prisonBars = document.querySelectorAll('.prison-bar');
                prisonBars.forEach((bar, index) => {
                    // Stagger the disappearance for visual effect
                    setTimeout(() => {
                        bar.style.transition = 'transform 0.5s, opacity 0.5s';
                        bar.style.transform = 'scale(0.8)';
                        bar.style.opacity = '0';
                        
                        // Remove the physics body from the world
                        if (index < obstacles.length) {
                            // Only remove the physics body once to avoid errors
                            if (obstacles[index] && obstacles[index].id) {
                                Composite.remove(engine.world, obstacles[index]);
                            }
                        }
                        
                        // Remove the DOM element after animation
                        setTimeout(() => {
                            bar.remove();
                        }, 500);
                    }, index * 100); // Stagger by 100ms per bar
                });
            }
        }
        
        // Continue the render loop
        requestAnimationFrame(updateRender);
    }
    
    // Handle collisions
    function handleCollisions(event) {
        // We no longer need to check for collisions with the target
        // as we'll check for proximity in the updateRender function
    }
    
    // Start holding for charge
    function startHold(event) {
        if (isLevelComplete || isLevelFailed) return;
        
        // Get click position relative to the game box
        const rect = gameBox.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;
        
        isHolding = true;
        holdStartTime = Date.now();
        holdPosition = { x: clickX, y: clickY };
        
        // Create charge indicator
        createChargeIndicator(clickX, clickY);
        
        // Set timer for maximum hold time (2 seconds)
        holdTimer = setTimeout(() => {
            if (isHolding) {
                endHold(event);
            }
        }, maxHoldTime);
    }
    
    // End holding and create explosion
    function endHold(event) {
        if (!isHolding || isLevelComplete || isLevelFailed) return;
        
        isHolding = false;
        clearTimeout(holdTimer);
        
        // Check if there are explosions remaining
        if (explosionsRemaining <= 0) {
            // Remove charge indicator
            if (chargeIndicator) {
                chargeIndicator.remove();
                chargeIndicator = null;
            }
            return;
        }
        
        // Calculate hold duration (capped at maxHoldTime)
        const holdDuration = Math.min(Date.now() - holdStartTime, maxHoldTime);
        const chargePercentage = holdDuration / maxHoldTime;
        
        // Remove charge indicator
        if (chargeIndicator) {
            chargeIndicator.remove();
            chargeIndicator = null;
        }
        
        // Create explosion with size based on hold duration
        createExplosion(holdPosition.x, holdPosition.y, chargePercentage);
        
        // Decrement explosions remaining
        explosionsRemaining--;
        updateExplosionCounter();
        
        // Check if out of explosions
        if (explosionsRemaining <= 0) {
            // If level is not complete, show level failed after a short delay
            setTimeout(() => {
                if (!isLevelComplete) {
                    showLevelFailed();
                }
            }, 1000);
        }
    }
    
    // Create and update charge indicator
    function createChargeIndicator(x, y) {
        chargeIndicator = document.createElement('div');
        chargeIndicator.className = 'charge-indicator';
        chargeIndicator.style.backgroundColor = 'rgba(255, 165, 0, 0.5)'; // Orange color
        
        // Set initial size (smaller than baseExplosionRadius)
        const initialSize = 30;  // Start with a smaller size
        chargeIndicator.style.width = `${initialSize}px`;
        chargeIndicator.style.height = `${initialSize}px`;
        
        // Position the circle so it's centered at the click point
        const offsetX = initialSize / 2;
        const offsetY = initialSize / 2;
        chargeIndicator.style.left = `${x - offsetX}px`;
        chargeIndicator.style.top = `${y - offsetY}px`;
        
        gameBox.appendChild(chargeIndicator);
    }
    
    // Update charge indicator size based on hold duration
    function updateChargeIndicator() {
        if (!chargeIndicator) return;
        
        const holdDuration = Math.min(Date.now() - holdStartTime, maxHoldTime);
        const chargePercentage = holdDuration / maxHoldTime;
        
        // Start from a smaller size (30px) and grow to maxExplosionRadius
        const currentSize = 30 + (maxExplosionRadius - 30) * chargePercentage;
        
        // Update size
        chargeIndicator.style.width = `${currentSize}px`;
        chargeIndicator.style.height = `${currentSize}px`;
        
        // Recalculate position to keep it centered as it grows
        const offsetX = currentSize / 2;
        const offsetY = currentSize / 2;
        chargeIndicator.style.left = `${holdPosition.x - offsetX}px`;
        chargeIndicator.style.top = `${holdPosition.y - offsetY}px`;
        
        // Change color from yellow to red as it charges
        const red = Math.floor(255);
        const green = Math.floor(165 * (1 - chargePercentage));
        const blue = 0;
        chargeIndicator.style.backgroundColor = `rgba(${red}, ${green}, ${blue}, 0.5)`;
        
        // Pulse effect (reduced pulse magnitude)
        const pulseScale = 0.9 + (Math.sin(Date.now() / 100) * 0.05);
        chargeIndicator.style.transform = `scale(${pulseScale})`;
    }
    
    // Create explosion at position with size based on charge percentage
    function createExplosion(x, y, chargePercentage) {
        // Play explosion sound if not muted
        if (!isSfxMuted) {
            // Create a new Audio instance each time to allow overlapping sounds
            const boomSound = new Audio('boom.mp3');
            boomSound.volume = 0.7 + (chargePercentage * 0.3); // Volume increases with charge (0.7 to 1.0)
            boomSound.play().catch(error => {
                console.log('Explosion sound playback failed:', error);
            });
        }
        
        // Calculate explosion size based on charge percentage
        const explosionRadius = 30 + (maxExplosionRadius - 30) * chargePercentage;
        const explosionForce = baseExplosionForce + (maxExplosionForce - baseExplosionForce) * chargePercentage;
        
        // Create explosion element
        const explosion = document.createElement('div');
        explosion.className = 'explosion';
        explosion.style.width = `${explosionRadius}px`;
        explosion.style.height = `${explosionRadius}px`;
        
        // Position the circle so it stays centered at the click point
        explosion.style.left = `${x - explosionRadius / 2}px`;
        explosion.style.top = `${y - explosionRadius / 2}px`;
        
        // Add explosion to game box
        gameBox.appendChild(explosion);
        
        // Remove explosion after animation
        setTimeout(() => {
            explosion.remove();
        }, 500);
        
        // Apply force to the ball
        const ballPos = ball.position;
        const dx = ballPos.x - x;
        const dy = ballPos.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < explosionRadius + ballRadius) {
            // Calculate proximity factor (closer = stronger boost)
            const proximityFactor = 1 + (proximityMultiplier * (1 - distance / (explosionRadius + ballRadius)));
            
            // Calculate force magnitude (closer = stronger)
            const forceMagnitude = Math.max(explosionForce * proximityFactor * (1 - distance / (explosionRadius + ballRadius)), 0.001);
            
            // Calculate force direction (away from explosion)
            const forceX = (dx / distance) * forceMagnitude;
            const forceY = (dy / distance) * forceMagnitude;
            
            // Apply force to ball
            Body.applyForce(ball, ballPos, { x: forceX, y: forceY });
        }
        
        // Apply force to wooden boxes (in level 2 and level 5)
        if (currentLevel === 2 || currentLevel === 5) {
            woodenBoxes.forEach(box => {
                const boxPos = box.body.position;
                const boxDx = boxPos.x - x;
                const boxDy = boxPos.y - y;
                const boxDistance = Math.sqrt(boxDx * boxDx + boxDy * boxDy);
                
                if (boxDistance < explosionRadius + Math.sqrt(box.width * box.width + box.height * box.height) / 2) {
                    // Calculate proximity factor for boxes (closer = stronger boost)
                    const boxProximityFactor = 1 + (proximityMultiplier * 0.5 * (1 - boxDistance / (explosionRadius + box.width / 2)));
                    
                    // Calculate force magnitude (closer = stronger)
                    const boxForceMagnitude = Math.max(explosionForce * boxProximityFactor * 0.8 * (1 - boxDistance / (explosionRadius + box.width / 2)), 0.001);
                    
                    // Calculate force direction (away from explosion)
                    const boxForceX = (boxDx / boxDistance) * boxForceMagnitude;
                    const boxForceY = (boxDy / boxDistance) * boxForceMagnitude;
                    
                    // Apply force to box
                    Body.applyForce(box.body, boxPos, { 
                        x: boxForceX * 2, // Doubled the force
                        y: boxForceY * 2  // Doubled the force
                    });
                    
                    // Apply torque based on where the explosion hit relative to center
                    const offsetX = x - boxPos.x;
                    const offsetY = y - boxPos.y;
                    const torque = (offsetX * boxForceY - offsetY * boxForceX) * 0.0002; // Doubled from 0.0001
                    Body.setAngularVelocity(box.body, box.body.angularVelocity + torque);
                }
            });
        }
    }
    
    // Complete the level
    function completeLevel() {
        if (isLevelComplete) return;
        
        isLevelComplete = true;
        
        // Stop the ball
        Body.setVelocity(ball, { x: 0, y: 0 });
        Body.setAngularVelocity(ball, 0);
        
        // Position ball at target center
        Body.setPosition(ball, { x: target.position.x, y: target.position.y });
        
        // Special handling for level 5 - slide down flagpole
        if (currentLevel === 5) {
            // Hide the regular level complete message
            levelComplete.style.display = 'none';
            
            // Get the target and ball elements
            const targetElement = document.getElementById('target');
            const ballElement = document.getElementById('ball');
            const flagpole = document.getElementById('flagpole');
            
            if (targetElement && ballElement && flagpole) {
                // Make the target stop pulsing and glow brighter
                targetElement.style.animation = 'none';
                targetElement.style.boxShadow = '0 0 30px rgba(0, 255, 0, 1)';
                targetElement.style.border = '4px solid rgba(0, 255, 0, 1)';
                
                // Get the flagpole's bottom position
                const flagpoleBottom = flagpole.offsetTop + flagpole.offsetHeight;
                
                // Calculate the target's current position
                const targetTop = parseInt(targetElement.style.top);
                const targetLeft = parseInt(targetElement.style.left);
                
                // Add transition for smooth sliding
                targetElement.style.transition = 'top 2s ease-in-out';
                ballElement.style.transition = 'top 2s ease-in-out';
                
                // Start the sliding animation after a short delay
                setTimeout(() => {
                    // Calculate the new top position (bottom of flagpole minus target height)
                    const newTop = flagpoleBottom - targetElement.offsetHeight;
                    
                    // Slide the target and ball down
                    targetElement.style.top = `${newTop}px`;
                    ballElement.style.top = `${newTop}px`;
                    
                    // Show congratulations popup after the animation completes
                    setTimeout(() => {
                        showLevel5Congratulations();
                    }, 2100); // Wait for the 2s animation to complete
                }, 500); // Short delay before starting the slide
            }
        } else {
            // Regular level completion for other levels
            // Show level complete message
            levelComplete.style.display = 'block';
            
            // Make the target stop pulsing and glow brighter
            const targetElement = document.getElementById('target');
            if (targetElement) {
                targetElement.style.animation = 'none';
                targetElement.style.boxShadow = '0 0 20px rgba(255, 255, 255, 1)';
                targetElement.style.border = '3px solid rgba(255, 255, 255, 1)';
            }
        }
        
        // Remove event listeners
        gameBox.removeEventListener('mousedown', startHold);
        gameBox.removeEventListener('mouseup', endHold);
        gameBox.removeEventListener('mouseleave', endHold);
    }
    
    // Show level 5 congratulations popup
    function showLevel5Congratulations() {
        // Create congratulations container
        const congratsContainer = document.createElement('div');
        congratsContainer.id = 'level5-congrats';
        congratsContainer.style.position = 'absolute';
        congratsContainer.style.top = '50%';
        congratsContainer.style.left = '50%';
        congratsContainer.style.transform = 'translate(-50%, -50%)';
        congratsContainer.style.backgroundColor = 'rgba(0, 200, 0, 0.9)'; // Green background
        congratsContainer.style.color = 'white';
        congratsContainer.style.padding = '30px';
        congratsContainer.style.borderRadius = '15px';
        congratsContainer.style.textAlign = 'center';
        congratsContainer.style.fontFamily = 'Arial, sans-serif';
        congratsContainer.style.zIndex = '200';
        congratsContainer.style.minWidth = '350px';
        congratsContainer.style.boxShadow = '0 0 30px rgba(0, 255, 0, 0.7)'; // Green glow
        
        // Create heading
        const heading = document.createElement('h2');
        heading.textContent = 'Congratulations!';
        heading.style.margin = '0 0 20px 0';
        heading.style.fontSize = '28px';
        heading.style.textShadow = '0 2px 4px rgba(0, 0, 0, 0.3)';
        
        // Create message
        const message = document.createElement('p');
        message.textContent = 'You completed Level 5!';
        message.style.margin = '0 0 25px 0';
        message.style.fontSize = '18px';
        
        // Create buttons container
        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.display = 'flex';
        buttonsContainer.style.justifyContent = 'center';
        buttonsContainer.style.gap = '15px';
        
        // Create restart button
        const restartButton = document.createElement('button');
        restartButton.textContent = 'Restart Level';
        restartButton.style.padding = '12px 20px';
        restartButton.style.backgroundColor = '#FC148F'; // Pink to match game theme
        restartButton.style.color = 'white';
        restartButton.style.border = 'none';
        restartButton.style.borderRadius = '5px';
        restartButton.style.cursor = 'pointer';
        restartButton.style.fontSize = '16px';
        restartButton.style.fontWeight = 'bold';
        restartButton.style.boxShadow = '0 3px 5px rgba(0, 0, 0, 0.2)';
        restartButton.addEventListener('click', () => {
            congratsContainer.remove();
            init(); // Restart the level
        });
        
        // Add hover effect
        restartButton.onmouseover = () => {
            restartButton.style.backgroundColor = '#D1107A'; // Darker shade of pink for hover
        };
        restartButton.onmouseout = () => {
            restartButton.style.backgroundColor = '#FC148F'; // Back to original pink
        };
        
        // Create back to levels button
        const backButton = document.createElement('button');
        backButton.textContent = 'Level Selection';
        backButton.style.padding = '12px 20px';
        backButton.style.backgroundColor = '#4CAF50'; // Green button
        backButton.style.color = 'white';
        backButton.style.border = 'none';
        backButton.style.borderRadius = '5px';
        backButton.style.cursor = 'pointer';
        backButton.style.fontSize = '16px';
        backButton.style.fontWeight = 'bold';
        backButton.style.boxShadow = '0 3px 5px rgba(0, 0, 0, 0.2)';
        backButton.addEventListener('click', () => {
            congratsContainer.remove();
            showLevelSelection(); // Go back to level selection
        });
        
        // Add hover effect
        backButton.onmouseover = () => {
            backButton.style.backgroundColor = '#3E8E41'; // Darker shade of green for hover
        };
        backButton.onmouseout = () => {
            backButton.style.backgroundColor = '#4CAF50'; // Back to original green
        };
        
        // Add buttons to container
        buttonsContainer.appendChild(restartButton);
        buttonsContainer.appendChild(backButton);
        
        // Add elements to congratulations container
        congratsContainer.appendChild(heading);
        congratsContainer.appendChild(message);
        congratsContainer.appendChild(buttonsContainer);
        
        // Add congratulations container to game box
        gameBox.appendChild(congratsContainer);
        
        // Add a subtle entrance animation
        congratsContainer.style.opacity = '0';
        congratsContainer.style.transition = 'opacity 0.5s ease-in-out';
        
        // Trigger animation after a small delay
        setTimeout(() => {
            congratsContainer.style.opacity = '1';
        }, 50);
    }
    
    // Reset from dark mode
    function resetDarkMode() {
        // Reset game box background
        gameBox.style.backgroundColor = '#FFF0F8';
        
        // Remove all dark mode elements
        const darkElements = ['dark-overlay', 'ball-light', 'cursor-light'];
        darkElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.remove();
            }
        });
        
        // Remove mouse move event listener
        gameBox.removeEventListener('mousemove', updateCursorLight);
    }
    
    // Update cursor light position
    function updateCursorLight(event) {
        const cursorLight = document.getElementById('cursor-light');
        if (cursorLight) {
            const rect = gameBox.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            
            cursorLight.style.left = `${x - 100}px`; // Center the 200px light (half of 200px)
            cursorLight.style.top = `${y - 100}px`; // Center the 200px light (half of 200px)
            
            // Make the light appear and then fade
            cursorLight.style.opacity = '1';
            
            // Clear any existing timeout
            if (cursorLight.fadeTimeout) {
                clearTimeout(cursorLight.fadeTimeout);
            }
            
            // Set a timeout to fade the light
            cursorLight.fadeTimeout = setTimeout(() => {
                cursorLight.style.opacity = '0';
            }, 500);
            
            // Check if cursor is near the checkpoint to reveal it
            if (target) {
                const targetElement = document.getElementById('target');
                if (targetElement) {
                    const targetX = target.position.x;
                    const targetY = target.position.y;
                    const distance = Math.sqrt((x - targetX) * (x - targetX) + (y - targetY) * (y - targetY));
                    
                    // If cursor light is close to the target, make it visible
                    if (distance < 90) { // Decreased from 120px to 90px
                        targetElement.style.opacity = '1';
                    } else {
                        // Check if ball light is close to the target
                        const ballPos = ball ? ball.position : { x: 0, y: 0 };
                        const ballDistance = Math.sqrt((ballPos.x - targetX) * (ballPos.x - targetX) + 
                                                      (ballPos.y - targetY) * (ballPos.y - targetY));
                        
                        // Only hide if ball light is also not close
                        if (ballDistance > 80) { // Decreased from 100px to 80px
                            targetElement.style.opacity = '0';
                        }
                    }
                }
            }
        }
    }
    
    // Function to replace the title with the Pookie Bot logo
    function replaceTitleWithLogo() {
        // Find the title element (assuming it has an id of 'game-title' or similar)
        const titleElement = document.getElementById('game-title');
        
        // Hide the title element when on the level selection screen
        if (levelSelection.style.display !== 'none') {
            if (titleElement) {
                titleElement.style.display = 'none';
            }
        } else {
            // Show and update the title with logo for game screens
            if (titleElement) {
                // Show the title element
                titleElement.style.display = 'block';
                
                // Clear the existing content
                titleElement.innerHTML = '';
                
                // Create the logo image
                const logoImg = document.createElement('img');
                logoImg.src = 'PookieBot_Logo.png';
                logoImg.alt = 'Pookie Bot';
                logoImg.style.maxWidth = '400px';
                logoImg.style.display = 'block';
                logoImg.style.margin = '0 auto 20px auto';
                
                // Add the logo to the title element
                titleElement.appendChild(logoImg);
            }
        }
        
        // Remove the logo from level selection screen as we'll be adding it differently
        // The new compressed logo will be added in the createStarLevelSelection function
    }
    
    // Function to add cloud background to level 5
    function addCloudBackground() {
        // Create first cloud
        const cloud1 = document.createElement('img');
        cloud1.src = 'cloudbackground.png';
        cloud1.className = 'cloud-background';
        cloud1.style.position = 'absolute';
        cloud1.style.top = '50px';
        cloud1.style.left = '100px';
        cloud1.style.width = '150px';
        cloud1.style.height = 'auto';
        cloud1.style.zIndex = '1'; // Behind game elements
        cloud1.style.opacity = '0.7';
        cloud1.style.pointerEvents = 'none'; // Don't interfere with clicks
        
        // Create second cloud
        const cloud2 = document.createElement('img');
        cloud2.src = 'cloudbackground.png';
        cloud2.className = 'cloud-background';
        cloud2.style.position = 'absolute';
        cloud2.style.top = '200px';
        cloud2.style.right = '120px';
        cloud2.style.width = '180px';
        cloud2.style.height = 'auto';
        cloud2.style.zIndex = '1'; // Behind game elements
        cloud2.style.opacity = '0.7';
        cloud2.style.transform = 'scaleX(-1)'; // Flip horizontally for variety
        cloud2.style.pointerEvents = 'none'; // Don't interfere with clicks
        
        // Add clouds to game box
        gameBox.appendChild(cloud1);
        gameBox.appendChild(cloud2);
    }
    
    // Function to create star-shaped level selection with Pookie logo in the center
    function createStarLevelSelection() {
        // Get the level selection container and clear it
        const levelSelection = document.getElementById('level-selection');
        levelSelection.innerHTML = '';
        
        // Create a container for the logo and buttons with relative positioning
        const starContainer = document.createElement('div');
        starContainer.id = 'star-container';
        starContainer.style.position = 'relative';
        starContainer.style.width = '100%';
        starContainer.style.height = '650px'; // Increased height to accommodate larger icons
        starContainer.style.margin = '0 auto';
        starContainer.style.marginTop = '-50px'; // Move everything up by 50px
        
        // Add the compressed Pookie logo in the center
        const pookieLogo = document.createElement('img');
        pookieLogo.src = 'Compressed_Pookie_Logo.png';
        pookieLogo.alt = 'Pookie Bot';
        pookieLogo.id = 'pookie-center-logo';
        pookieLogo.style.position = 'absolute';
        pookieLogo.style.left = '50%';
        pookieLogo.style.top = '57%'; // Moved up by 20 pixels (from 60% to 57%)
        pookieLogo.style.transform = 'translate(-50%, -50%)';
        pookieLogo.style.width = '350px'; // Reduced from 400px to 350px
        pookieLogo.style.height = 'auto';
        pookieLogo.style.zIndex = '1';
        
        // Add the logo to the container
        starContainer.appendChild(pookieLogo);
        
        // Create and position level buttons in a star pattern
        
        // Level 1: Down and to the left of center (moved farther left)
        const level1Btn = createLevelButton(1, '15%', '65%'); // Changed from 20% to 15% for X position (farther from center)
        starContainer.appendChild(level1Btn);
        
        // Level 2: Left and up above center - moved slightly closer to center and up
        const level2Btn = createLevelButton(2, '30%', '28%'); // Changed from 25% to 30% for X (closer to center) and from 30% to 28% for Y (higher up)
        starContainer.appendChild(level2Btn);
        
        // Level 3: Right and up above center - moved slightly closer to center and up
        const level3Btn = createLevelButton(3, '70%', '28%'); // Changed from 75% to 70% for X (closer to center) and from 30% to 28% for Y (higher up)
        starContainer.appendChild(level3Btn);
        
        // Level 4: Down and to the right of center (moved farther right)
        const level4Btn = createLevelButton(4, '85%', '65%'); // Changed from 80% to 85% for X position (farther from center)
        starContainer.appendChild(level4Btn);
        
        // Level 5: Straight down below center
        const level5Btn = createLevelButton(5, '50%', '85%'); // Changed from 80% to 85% for Y position (more down)
        starContainer.appendChild(level5Btn);
        
        // Add the star container to the level selection
        levelSelection.appendChild(starContainer);
    }
    
    // Helper function to create a level button with absolute positioning
    function createLevelButton(level, leftPos, topPos) {
        // Create a container for the button and icon
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'level-btn-container';
        buttonContainer.style.position = 'absolute';
        buttonContainer.style.left = leftPos;
        buttonContainer.style.top = topPos;
        buttonContainer.style.transform = 'translate(-50%, -50%)';
        buttonContainer.style.display = 'flex';
        buttonContainer.style.flexDirection = 'column';
        buttonContainer.style.alignItems = 'center';
        buttonContainer.style.gap = '0'; // Remove the gap
        
        // Create the level icon with a negative margin to create overlap
        const levelIcon = document.createElement('img');
        levelIcon.src = `level${level}.png`;
        levelIcon.alt = `Level ${level} Icon`;
        levelIcon.className = 'level-icon';
        levelIcon.style.width = '140px'; // Doubled from 70px
        levelIcon.style.height = '140px'; // Doubled from 70px
        levelIcon.style.border = '4px solid #FC148F'; // Slightly thicker border
        levelIcon.style.borderRadius = '16px'; // Increased to match larger size
        levelIcon.style.padding = '8px'; // Increased to match larger size
        levelIcon.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
        levelIcon.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.2)'; // Enhanced shadow
        levelIcon.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease';
        levelIcon.style.objectFit = 'contain';
        levelIcon.style.marginBottom = '-8px'; // Add negative margin to create overlap
        
        // Add hover effect to the icon
        levelIcon.onmouseover = () => {
            levelIcon.style.transform = 'scale(1.1)';
        };
        levelIcon.onmouseout = () => {
            levelIcon.style.transform = 'scale(1)';
        };
        
        // Create the button
        const button = document.createElement('button');
        button.className = 'level-btn';
        button.setAttribute('data-level', level);
        button.textContent = `Level ${level}`;
        
        // Add animation with slight delay based on level number for staggered effect
        button.style.animation = `levelButtonPulse 2s infinite ${level * 0.2}s`;
        
        // Add click event listener to both the icon and button
        const startLevelFunc = () => {
            const levelNum = parseInt(button.getAttribute('data-level'));
            startLevel(levelNum);
        };
        
        button.addEventListener('click', startLevelFunc);
        levelIcon.addEventListener('click', startLevelFunc);
        
        // Add elements to container
        buttonContainer.appendChild(levelIcon);
        buttonContainer.appendChild(button);
        
        return buttonContainer;
    }
    
    // Function to remove cloud background
    function removeCloudBackground() {
        // Remove any existing cloud elements
        const clouds = document.querySelectorAll('.cloud-background');
        clouds.forEach(cloud => cloud.remove());
    }
    
    // Show level selection screen
    function showLevelSelection() {
        gameScreen.style.display = 'none';
        levelSelection.style.display = 'block';
        
        // Hide the title with logo when showing level selection
        const titleElement = document.getElementById('game-title');
        if (titleElement) {
            titleElement.style.display = 'none';
        }
        
        // Create the star-shaped level selection with Pookie logo
        createStarLevelSelection();
        
        // Play background music when returning to level selection if not muted
        playBackgroundMusic();
        
        // Ensure dark mode is properly reset
        resetDarkMode();
        
        // Stop the physics engine
        if (runner) {
            Runner.stop(runner);
            runner = null;
        }
        
        if (render) {
            Render.stop(render);
            render = null;
        }
    }

    // Show game screen and start the selected level
    function startLevel(level) {
        currentLevel = level;
        levelSelection.style.display = 'none';
        gameScreen.style.display = 'block';
        
        // Show the title with logo when starting a level
        const titleElement = document.getElementById('game-title');
        if (titleElement) {
            titleElement.style.display = 'block';
            replaceTitleWithLogo(); // Update the title with the logo
        }
        
        // Pause background music when starting a level
        pauseBackgroundMusic();
        
        init();
    }

    // Event listeners for level buttons
    levelButtons.forEach(button => {
        button.addEventListener('click', () => {
            const level = parseInt(button.getAttribute('data-level'));
            startLevel(level);
        });
    });

    // Event listener for restart button
    restartBtn.addEventListener('click', () => {
        init();
    });

    // Event listener for back to levels button
    backToLevelsBtn.addEventListener('click', () => {
        showLevelSelection();
    });

    // Start with level selection screen
    showLevelSelection();

    // Update charge indicator on animation frame
    function animate() {
        if (isHolding && chargeIndicator) {
            updateChargeIndicator();
        }
        requestAnimationFrame(animate);
    }

    // Start animation loop
    animate();

    // Debug function to check if SVG file exists
    function checkSvgFile() {
        console.log('Checking if SVG file exists...');
        fetch('file.svg')
            .then(response => {
                console.log('SVG file response:', response.status, response.statusText);
                if (!response.ok) {
                    console.error('SVG file not found or not accessible');
                } else {
                    console.log('SVG file found and accessible');
                }
            })
            .catch(error => {
                console.error('Error checking SVG file:', error);
            });
    }

    // Setup dark mode for level 3
    function setupDarkMode() {
        // First, ensure any existing dark mode elements are removed
        resetDarkMode();
        
        // Set game box background to black
        gameBox.style.backgroundColor = '#000000';
        
        // Create a dark overlay
        const darkOverlay = document.createElement('div');
        darkOverlay.id = 'dark-overlay';
        darkOverlay.style.position = 'absolute';
        darkOverlay.style.top = '0';
        darkOverlay.style.left = '0';
        darkOverlay.style.width = '100%';
        darkOverlay.style.height = '100%';
        darkOverlay.style.backgroundColor = 'black';
        darkOverlay.style.zIndex = '50';
        darkOverlay.style.pointerEvents = 'none'; // Allow clicks to pass through
        gameBox.appendChild(darkOverlay);
        
        // Create a radial gradient for the ball light
        const ballLight = document.createElement('div');
        ballLight.id = 'ball-light';
        ballLight.style.position = 'absolute';
        ballLight.style.width = '150px';
        ballLight.style.height = '150px';
        ballLight.style.borderRadius = '50%';
        ballLight.style.background = 'radial-gradient(circle, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 70%)';
        ballLight.style.zIndex = '51';
        ballLight.style.pointerEvents = 'none';
        ballLight.style.mixBlendMode = 'screen';
        gameBox.appendChild(ballLight);
        
        // Create a cursor light that follows the mouse
        const cursorLight = document.createElement('div');
        cursorLight.id = 'cursor-light';
        cursorLight.style.position = 'absolute';
        cursorLight.style.width = '200px'; // Increased from 100px
        cursorLight.style.height = '200px'; // Increased from 100px
        cursorLight.style.borderRadius = '50%';
        cursorLight.style.background = 'radial-gradient(circle, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 70%)'; // Increased brightness from 0.5 to 0.7
        cursorLight.style.zIndex = '52';
        cursorLight.style.pointerEvents = 'none';
        cursorLight.style.mixBlendMode = 'screen';
        cursorLight.style.opacity = '0';
        cursorLight.style.transition = 'opacity 1s';
        gameBox.appendChild(cursorLight);
        
        // Add mouse move event listener for cursor light
        gameBox.addEventListener('mousemove', updateCursorLight);
        
        // Make the target glow more in dark mode
        const targetElement = document.getElementById('target');
        if (targetElement) {
            targetElement.style.boxShadow = '0 0 20px rgba(255, 255, 255, 0.9)';
            targetElement.style.zIndex = '53'; // Ensure it's above the overlay
        }
    }

    // Create gold glowing circle for level 2
    function createGoldCircle(x, y) {
        // Only create gold circle for level 2
        if (currentLevel !== 2) {
            return;
        }
        
        // Remove existing gold circle if it exists
        const existingGoldCircle = document.getElementById('gold-circle');
        if (existingGoldCircle) {
            existingGoldCircle.remove();
        }
        
        // Create new gold circle element
        const goldCircle = document.createElement('div');
        goldCircle.id = 'gold-circle';
        goldCircle.style.width = '30px';
        goldCircle.style.height = '30px';
        goldCircle.style.borderRadius = '50%';
        goldCircle.style.position = 'absolute';
        goldCircle.style.left = `${x - 15}px`; // Center horizontally
        goldCircle.style.top = `${y - 15}px`; // Center vertically
        goldCircle.style.backgroundColor = '#FFD700'; // Gold color
        goldCircle.style.boxShadow = '0 0 15px rgba(255, 215, 0, 0.8)'; // Gold glow
        goldCircle.style.border = '2px solid #FFC000';
        goldCircle.style.zIndex = '10';
        goldCircle.style.animation = 'goldCirclePulse 2s infinite ease-in-out';
        
        // Add keyframes for gold pulse animation if it doesn't exist
        if (!document.getElementById('goldCirclePulseAnimation')) {
            const styleSheet = document.createElement('style');
            styleSheet.id = 'goldCirclePulseAnimation';
            styleSheet.textContent = `
                @keyframes goldCirclePulse {
                    0% { box-shadow: 0 0 15px rgba(255, 215, 0, 0.8); }
                    50% { box-shadow: 0 0 25px rgba(255, 215, 0, 1); }
                    100% { box-shadow: 0 0 15px rgba(255, 215, 0, 0.8); }
                }
            `;
            document.head.appendChild(styleSheet);
        }
        
        // Add to game box
        gameBox.appendChild(goldCircle);
    }
}); 
