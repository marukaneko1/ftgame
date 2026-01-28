// @ts-nocheck
import { Ball, State } from "../model/ball"
import { TableGeometry } from "../view/tablegeometry"
import { Vector3 } from "three"
import { roundVec, vec } from "./utils"
import { R } from "../model/physics/constants"
import { Table } from "../model/table"

export class Rack {
  static readonly noise = R * 0.0233
  static readonly gap = 2 * R + 2 * Rack.noise
  static readonly up = new Vector3(0, 0, -1)
  static readonly spot = new Vector3(-TableGeometry.X / 2, 0.0, 0)
  static readonly across = new Vector3(0, Rack.gap, 0)
  static readonly down = new Vector3(Rack.gap, 0, 0)
  static readonly diagonal = Rack.across
    .clone()
    .applyAxisAngle(Rack.up, (Math.PI * 1) / 3)

  private static jitter(pos) {
    return roundVec(
      pos
        .clone()
        .add(
          new Vector3(
            Rack.noise * (Math.random() - 0.5),
            Rack.noise * (Math.random() - 0.5),
            0
          )
        )
    )
  }

  static cueBall(pos) {
    return new Ball(Rack.jitter(pos), 0xfaebd7)
  }

  static diamond() {
    const pos = new Vector3(TableGeometry.tableX / 2, 0, 0)
    const diamond: Ball[] = []
    diamond.push(Rack.cueBall(Rack.spot))
    diamond.push(new Ball(Rack.jitter(pos), 0xe0de36))
    pos.add(Rack.diagonal)
    diamond.push(new Ball(Rack.jitter(pos), 0xff9d00))
    pos.sub(Rack.across)
    diamond.push(new Ball(Rack.jitter(pos), 0x521911))
    pos.add(Rack.diagonal)
    diamond.push(new Ball(Rack.jitter(pos), 0x595200))
    pos.sub(Rack.across)
    diamond.push(new Ball(Rack.jitter(pos), 0xff0000))
    pos.addScaledVector(Rack.across, 2)
    diamond.push(new Ball(Rack.jitter(pos), 0x050505))
    pos.add(Rack.diagonal).sub(Rack.across)
    diamond.push(new Ball(Rack.jitter(pos), 0x0a74c2))
    pos.sub(Rack.across)
    diamond.push(new Ball(Rack.jitter(pos), 0x087300))
    pos.add(Rack.diagonal)
    diamond.push(new Ball(Rack.jitter(pos), 0x3e009c))
    return diamond
  }

  static triangle() {
    const tp = Rack.trianglePositions()
    const cueball = Rack.cueBall(Rack.spot)
    const triangle = tp.map((p) => new Ball(Rack.jitter(p)))
    triangle.unshift(cueball)
    return triangle.slice(0, 5)
  }

  static trianglePositions() {
    const triangle: Vector3[] = []
    const pos = new Vector3(TableGeometry.X / 2, 0, 0)
    triangle.push(vec(pos))
    // row 2
    pos.add(this.diagonal)
    triangle.push(vec(pos))
    pos.sub(this.across)
    triangle.push(vec(pos))
    // row 3
    pos.add(this.diagonal)
    triangle.push(vec(pos))
    pos.sub(this.across)
    triangle.push(vec(pos))
    pos.addScaledVector(this.across, 2)
    triangle.push(vec(pos))
    // row 4
    pos.add(this.diagonal)
    triangle.push(vec(pos))
    pos.sub(this.across)
    triangle.push(vec(pos))
    pos.sub(this.across)
    triangle.push(vec(pos))
    pos.sub(this.across)
    triangle.push(vec(pos))
    // row 5
    pos.add(this.diagonal).sub(this.across)
    triangle.push(vec(pos))
    pos.add(this.across)
    triangle.push(vec(pos))
    pos.add(this.across)
    triangle.push(vec(pos))
    pos.add(this.across)
    triangle.push(vec(pos))
    pos.add(this.across)
    triangle.push(vec(pos))

    return triangle
  }

  static rerack(key: Ball, table: Table) {
    const tp = Rack.trianglePositions()
    const first = tp.shift()!
    table.balls
      .filter((b) => b !== table.cueball)
      .filter((b) => b !== key)
      .forEach((b) => {
        b.pos.copy(Rack.jitter(tp.shift()))
        b.state = State.Stationary
      })
    if (table.overlapsAny(key.pos, key)) {
      key.pos.copy(first)
    }
    if (table.overlapsAny(table.cueball.pos)) {
      table.cueball.pos.copy(Rack.spot)
    }
  }

  static three() {
    const threeballs: Ball[] = []
    const dx = TableGeometry.X / 2
    const dy = TableGeometry.Y / 4
    threeballs.push(Rack.cueBall(Rack.jitter(new Vector3(-dx, -dy, 0))))
    threeballs.push(new Ball(Rack.jitter(new Vector3(-dx, 0, 0)), 0xe0de36))
    threeballs.push(new Ball(Rack.jitter(new Vector3(dx, 0, 0)), 0xff0000))
    return threeballs
  }

  static readonly sixth = (TableGeometry.Y * 2) / 6
  static readonly baulk = (-1.5 * TableGeometry.X * 2) / 5

  static snooker() {
    const balls: Ball[] = []
    const dy = TableGeometry.Y / 4
    balls.push(Rack.cueBall(Rack.jitter(new Vector3(Rack.baulk, -dy * 0.5, 0))))

    const colours = Rack.snookerColourPositions()
    balls.push(new Ball(Rack.jitter(colours[0]), 0xeede36))
    balls.push(new Ball(Rack.jitter(colours[1]), 0x0c9664))
    balls.push(new Ball(Rack.jitter(colours[2]), 0xbd723a))
    balls.push(new Ball(Rack.jitter(colours[3]), 0x0883ee))
    balls.push(new Ball(Rack.jitter(colours[4]), 0xffaacc))
    balls.push(new Ball(Rack.jitter(colours[5]), 0x010101))

    // change to 15 red balls
    const triangle = Rack.trianglePositions().slice(0, 15)
    triangle.forEach((p) => {
      balls.push(new Ball(Rack.jitter(p.add(Rack.down)), 0xee0000))
    })
    return balls
  }

  static snookerColourPositions() {
    const dx = TableGeometry.X / 2
    const black = TableGeometry.X - (TableGeometry.X * 2) / 11
    const positions: Vector3[] = []
    positions.push(new Vector3(Rack.baulk, -Rack.sixth, 0))
    positions.push(new Vector3(Rack.baulk, Rack.sixth, 0))
    positions.push(new Vector3(Rack.baulk, 0, 0))
    positions.push(new Vector3(0, 0, 0))
    positions.push(new Vector3(dx, 0, 0))
    positions.push(new Vector3(black, 0, 0))
    return positions
  }

  // 8-ball rack: triangle with 1-ball at front, 8-ball in center
  static eightBall() {
    // Reset ball IDs for proper 8-ball game logic
    Ball.id = 0
    
    const triangle = Rack.trianglePositions()
    
    // Standard 8-ball colors
    const solidColors = {
      1: 0xFFFF00,  // Yellow
      2: 0x0000FF,  // Blue
      3: 0xFF0000,  // Red
      4: 0x800080,  // Purple
      5: 0xFF8C00,  // Orange
      6: 0x006400,  // Dark Green
      7: 0x8B4513,  // Brown/Maroon
    }
    
    const stripeColors = {
      9: 0xFFFF00,  // Yellow stripe
      10: 0x0000FF, // Blue stripe
      11: 0xFF0000, // Red stripe
      12: 0x800080, // Purple stripe
      13: 0xFF8C00, // Orange stripe
      14: 0x006400, // Dark Green stripe
      15: 0x8B4513, // Brown stripe
    }
    
    // Ball 0: Cue ball (white)
    const cueball = Rack.cueBall(Rack.spot)  // ID 0
    
    // Create array to hold all balls in order by ID
    const balls: Ball[] = [cueball]
    
    // Standard 8-ball positions in triangle (positions in rack)
    // Position 0: 1-ball (front)
    // Position 4 (center of 3rd row): 8-ball
    // Remaining positions: mix of solids and stripes
    
    // Create positions array with ball assignments
    // Triangle has 15 positions (5 rows: 1+2+3+4+5)
    const ballAssignments: {id: number, color: number, pos: Vector3}[] = []
    
    // 1-ball always at apex (position 0)
    ballAssignments.push({ id: 1, color: solidColors[1], pos: triangle[0] })
    
    // 8-ball always in center of 3rd row (position 4 in 0-indexed triangle)
    ballAssignments.push({ id: 8, color: 0x000000, pos: triangle[4] })
    
    // Remaining solids (2-7) and stripes (9-15)
    const remainingSolids = [2, 3, 4, 5, 6, 7]
    const remainingStripes = [9, 10, 11, 12, 13, 14, 15]
    
    // Shuffle them
    for (let i = remainingSolids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [remainingSolids[i], remainingSolids[j]] = [remainingSolids[j], remainingSolids[i]];
    }
    for (let i = remainingStripes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [remainingStripes[i], remainingStripes[j]] = [remainingStripes[j], remainingStripes[i]];
    }
    
    // Remaining positions (exclude 0 for 1-ball and 4 for 8-ball)
    const remainingPositions = [1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]
    
    // Mix solids and stripes for remaining positions
    // Rule: corners of last row must have one solid and one stripe
    let solidIdx = 0
    let stripeIdx = 0
    
    remainingPositions.forEach((posIdx, i) => {
      // Alternate between solid and stripe for fair distribution
      if (i % 2 === 0 && solidIdx < remainingSolids.length) {
        const ballNum = remainingSolids[solidIdx++]
        ballAssignments.push({ id: ballNum, color: solidColors[ballNum], pos: triangle[posIdx] })
      } else if (stripeIdx < remainingStripes.length) {
        const ballNum = remainingStripes[stripeIdx++]
        ballAssignments.push({ id: ballNum, color: stripeColors[ballNum], pos: triangle[posIdx] })
      } else if (solidIdx < remainingSolids.length) {
        const ballNum = remainingSolids[solidIdx++]
        ballAssignments.push({ id: ballNum, color: solidColors[ballNum], pos: triangle[posIdx] })
      }
    })
    
    // Sort by ID and create balls in order so Ball.id matches
    ballAssignments.sort((a, b) => a.id - b.id)
    
    // Create balls in ID order
    ballAssignments.forEach(assignment => {
      const ball = new Ball(Rack.jitter(assignment.pos), assignment.color)
      // Ball.id auto-increments, so ball.id should equal assignment.id
      balls.push(ball)
    })
    
    console.log("[Rack] Created 8-ball rack with", balls.length, "balls")
    console.log("[Rack] Ball IDs:", balls.map(b => b.id).join(", "))
    
    return balls
  }
}
