#!/usr/bin/env python3
"""
Tic Tac Toe - A classic game for two players.
Play against a friend on the command line!
"""

def print_board(board):
    """Display the game board with row/column numbers."""
    print("\n")
    print("    1   2   3")
    print("  +---+---+---+")
    for i, row in enumerate(board):
        print(f"{i+1} | {row[0]} | {row[1]} | {row[2]} |")
        if i < 2:
            print("  +---+---+---+")
    print("  +---+---+---+\n")

def check_winner(board, player):
    """Check if the specified player has won."""
    # Check rows
    for row in board:
        if all(cell == player for cell in row):
            return True
    
    # Check columns
    for col in range(3):
        if all(board[row][col] == player for row in range(3)):
            return True
    
    # Check diagonals
    if all(board[i][i] == player for i in range(3)):
        return True
    if all(board[i][2-i] == player for i in range(3)):
        return True
    
    return False

def is_board_full(board):
    """Check if the board is full (draw)."""
    return all(cell != ' ' for row in board for cell in row)

def get_move(player, board):
    """Get a valid move from the player."""
    while True:
        try:
            row = int(input(f"Player {player}, enter row (1-3): ")) - 1
            col = int(input(f"Player {player}, enter column (1-3): ")) - 1
            
            if row < 0 or row > 2 or col < 0 or col > 2:
                print("Invalid input! Please enter numbers between 1 and 3.")
                continue
            
            if board[row][col] != ' ':
                print("That cell is already taken! Choose another.")
                continue
            
            return row, col
        except ValueError:
            print("Invalid input! Please enter numbers.")

def play_game():
    """Main game loop."""
    # Initialize empty board
    board = [[' ' for _ in range(3)] for _ in range(3)]
    current_player = 'X'
    
    print("=" * 40)
    print("   WELCOME TO TIC TAC TOE!")
    print("=" * 40)
    print("Players take turns marking cells on a 3x3 grid.")
    print("The first player to get 3 in a row wins!")
    print("Enter row and column numbers (1-3) to place your mark.\n")
    
    while True:
        print_board(board)
        
        # Get move from current player
        row, col = get_move(current_player, board)
        board[row][col] = current_player
        
        # Check for winner
        if check_winner(board, current_player):
            print_board(board)
            print(f"🎉 Player {current_player} WINS! 🎉")
            break
        
        # Check for draw
        if is_board_full(board):
            print_board(board)
            print("It's a DRAW! Well played!")
            break
        
        # Switch players
        current_player = 'O' if current_player == 'X' else 'X'

def main():
    """Entry point for the game."""
    while True:
        play_game()
        
        # Ask if players want to play again
        play_again = input("\nPlay again? (y/n): ").strip().lower()
        if play_again != 'y':
            print("\nThanks for playing! Goodbye! 👋")
            break
        print("\n" + "=" * 40 + "\n")

if __name__ == "__main__":
    main()
