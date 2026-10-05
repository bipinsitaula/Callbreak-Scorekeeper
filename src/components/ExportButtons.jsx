import { FiDownload, FiShare2 } from 'react-icons/fi'
import { useToastStore } from '../hooks/useToast'
import { downloadCsv, shareResultsImage } from '../utils/export'

/** CSV download + "share as image" for a set of rounds. */
export default function ExportButtons({ players, rounds, totalRounds, className = '' }) {
  const { success, error } = useToastStore()

  const handleShare = async () => {
    try {
      const result = await shareResultsImage(players, rounds, totalRounds)
      if (result === 'downloaded') success('Results image downloaded.')
    } catch (e) {
      console.warn(e)
      error('Could not create the results image. Try again.')
    }
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <button type="button" className="btn btn-secondary !min-h-0 !px-3.5 !py-2" onClick={() => downloadCsv(players, rounds)}>
        <FiDownload className="h-4 w-4" aria-hidden="true" />
        Download CSV
      </button>
      <button type="button" className="btn btn-secondary !min-h-0 !px-3.5 !py-2" onClick={handleShare}>
        <FiShare2 className="h-4 w-4" aria-hidden="true" />
        Share image
      </button>
    </div>
  )
}
